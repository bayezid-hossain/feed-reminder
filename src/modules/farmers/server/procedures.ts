import { db } from "@/db";
import { farmerHistory, farmers } from "@/db/schema";
import { getFeedForDay, GRAMS_PER_BAG } from "@/lib/constants";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { addMortalitySchema, farmerInsertSchema, farmerSearchSchema } from "../schema";

export const farmersRouter = createTRPCRouter({
    getMany: protectedProcedure.input(farmerSearchSchema).query(async ({ ctx, input }) => {
        const { search, page, pageSize, status } = input;

        const whereClause = and(
            eq(farmers.userId, ctx.auth.session.userId),
            eq(farmers.status, status),
            search ? ilike(farmers.name, `%${search}%`) : undefined
        );

        const data = await db.select()
            .from(farmers)
            .where(whereClause)
            .orderBy(desc(farmers.createdAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize);

        const [total] = await db.select({ count: count() })
            .from(farmers)
            .where(whereClause);

        const totalPages = Math.ceil(total.count / pageSize);
        return {
            items: data, total: total.count, totalPages
        };
    }),
syncFeed: protectedProcedure.mutation(async ({ ctx }) => {
    // 1. Fetch ONLY this user's active farmers
    const activeFarmers = await db.select()
      .from(farmers)
      .where(and(
        eq(farmers.status, "active"),
        eq(farmers.userId, ctx.auth.session.userId) // Secure scope
      ));

    let updatedCount = 0;
    let totalBagsAdded = 0;

    const updates = activeFarmers.map(async (farmer) => {
      // A. Calculate Age
      const now = new Date();
      const start = new Date(farmer.createdAt);
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const currentAge = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      // Skip if age hasn't changed
      if (currentAge <= farmer.age) return;

      // B. Calculate Feed
      const gramsPerBird = getFeedForDay(currentAge);
      const birdCount = parseInt(farmer.doc) || 0;
      
      // Subtract mortality for accuracy
      const liveBirds = Math.max(0, birdCount - farmer.mortality);
      const totalDailyGrams = gramsPerBird * liveBirds;
      
      // C. Convert to Bags
      const totalDailyBags = totalDailyGrams / GRAMS_PER_BAG;

      // D. Update DB
      await db.update(farmers)
        .set({
          intake: sql`${farmers.intake} + ${totalDailyBags}`,
          age: currentAge,
          updatedAt: new Date(),
        })
        .where(eq(farmers.id, farmer.id));

      updatedCount++;
      totalBagsAdded += totalDailyBags;
    });

    await Promise.all(updates);

    return { 
      success: true, 
      updatedCount, 
      totalBagsAdded 
    };
  }),
    create: protectedProcedure.input(farmerInsertSchema).mutation(async ({ input, ctx }) => {
        // 1. Check if name already exists in ACTIVE list (prevent duplicates)
        const existingActive = await db.select()
            .from(farmers)
            .where(and(
                eq(farmers.name, input.name),
                eq(farmers.userId, ctx.auth.session.userId)
            ))
            .limit(1);

        if (existingActive.length > 0) {
            throw new TRPCError({
                code: "CONFLICT",
                message: "A farmer with this name already exists in the active list."
            });
        }

        // 2. Check HISTORY for the latest record with this exact name
        const latestHistory = await db.select()
            .from(farmerHistory)
            .where(and(
                // Use 'ilike' if you want case-insensitive matching (e.g. "Farm A" == "farm a")
                // Use 'eq' if you want exact match only
                eq(farmerHistory.farmerName, input.name),
                eq(farmerHistory.userId, ctx.auth.session.userId)
            ))
            .orderBy(desc(farmerHistory.endDate)) // Get the most recent one
            .limit(1);

        // 3. Calculate the starting feed
        let totalInputFeed = input.inputFeed;
        
        // If we found a previous cycle, add its remaining feed
        if (latestHistory.length > 0) {
            const previousRemaining = latestHistory[0].finalRemaining;
            if (previousRemaining > 0) {
                totalInputFeed += previousRemaining;
            }
        }

        // 4. Create the new farmer with the calculated total
        const [createdFarmer] = await db.insert(farmers)
            .values({
                ...input,
                inputFeed: totalInputFeed, // Stores (New Input + Old Remaining)
                userId: ctx.auth.session.userId
            })
            .returning();

        return createdFarmer;
    }),

   end: protectedProcedure
    .input(z.object({ 
        id: z.string(), 
    }))
    .mutation(async ({ input, ctx }) => {
        return await db.transaction(async (tx) => {
            // 1. Get the current farmer data
            const [farmer] = await tx.select()
                .from(farmers)
                .where(and(eq(farmers.id, input.id), eq(farmers.userId, ctx.auth.session.userId)));

            if (!farmer) throw new TRPCError({ code: "NOT_FOUND" });

            // 2. Insert into history
            await tx.insert(farmerHistory).values({
                farmerName: farmer.name,
                userId: ctx.auth.session.userId,
                doc: farmer.doc,
                finalInputFeed: farmer.inputFeed,
                finalIntake: farmer.intake,
                finalRemaining: farmer.inputFeed - farmer.intake,
                mortality: farmer.mortality,
                age: farmer.age,
                startDate: farmer.createdAt, // Using createdAt as the cycle start
            });

            // 3. Delete from active farmers 
            // (Since you have a composite key of name+userId, deleting by ID is safe)
            await tx.delete(farmers)
                .where(eq(farmers.id, input.id));

            return { success: true };
        });
    }),
    addFeed: protectedProcedure
    .input(z.object({ 
        name: z.string(), 
        amount: z.number().int() 
    }))
    .mutation(async ({ input, ctx }) => {
        const [updatedFarmer] = await db.update(farmers)
            .set({ 
                inputFeed: sql`${farmers.inputFeed} + ${input.amount}`,
                updatedAt: new Date() 
            })
            .where(
                and(
                    eq(farmers.name, input.name), 
                    eq(farmers.userId, ctx.auth.session.userId)
                )
            )
            .returning();
            
        return updatedFarmer;
    }),
    getHistory: protectedProcedure.input(farmerSearchSchema).query(async ({ ctx, input }) => {
        const { search, page, pageSize } = input;

        const whereClause = and(
            eq(farmerHistory.userId, ctx.auth.session.userId),
            search ? ilike(farmerHistory.farmerName, `%${search}%`) : undefined
        );

        const data = await db.select()
            .from(farmerHistory)
            .where(whereClause)
            .orderBy(desc(farmerHistory.endDate))
            .limit(pageSize)
            .offset((page - 1) * pageSize);

        const [total] = await db.select({ count: count() })
            .from(farmerHistory)
            .where(whereClause);

        const totalPages = Math.ceil(total.count / pageSize);
        return {
            items: data, total: total.count, totalPages
        };
    }),
    addMortality: protectedProcedure
  .input(addMortalitySchema)
  .mutation(async ({ input, ctx }) => {
    const [updatedFarmer] = await db.update(farmers)
      .set({
        mortality: sql`${farmers.mortality} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(farmers.id, input.id),
          eq(farmers.userId, ctx.auth.session.userId)
        )
      )
      .returning();

    return updatedFarmer;
  }),
    getHistorySuggestion: protectedProcedure.input(farmerSearchSchema).query(async ({ ctx, input }) => {
        const { search, page, pageSize } = input;

        // Subquery for Latest Record per Name (DISTINCT ON behavior)
        const sq = db
            .select({
                id: farmerHistory.id,
                farmerName: farmerHistory.farmerName,
                doc: farmerHistory.doc,
                finalRemaining: farmerHistory.finalRemaining,
                endDate: farmerHistory.endDate,
                userId: farmerHistory.userId,
                rowNumber: sql<number>`row_number() over (partition by ${farmerHistory.farmerName} order by ${farmerHistory.endDate} desc)`.as("row_number"),
            })
            .from(farmerHistory)
            .where(
                and(
                    eq(farmerHistory.userId, ctx.auth.session.userId),
                    search ? ilike(farmerHistory.farmerName, `%${search}%`) : undefined
                )
            )
            .as("sq");

        const data = await db
            .select()
            .from(sq)
            .where(eq(sq.rowNumber, 1))
            .orderBy(desc(sq.endDate))
            .limit(pageSize)
            .offset((page - 1) * pageSize);

        const [totalCount] = await db
            .select({ count: sql<number>`count(distinct ${farmerHistory.farmerName})` })
            .from(farmerHistory)
            .where(
                and(
                    eq(farmerHistory.userId, ctx.auth.session.userId),
                    search ? ilike(farmerHistory.farmerName, `%${search}%`) : undefined
                )
            );

        const total = Number(totalCount?.count ?? 0);

        return {
            items: data,
            total,
            totalPages: Math.ceil(total / pageSize)
        };
    })

})
