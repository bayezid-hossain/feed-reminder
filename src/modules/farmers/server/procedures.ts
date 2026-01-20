import { db } from "@/db";
import { farmerHistory, farmers } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { addMortalitySchema, farmerInsertSchema, farmerSearchSchema } from "../schema";
import { updateFarmerFeed } from "./services/feed-service";

export const farmersRouter = createTRPCRouter({
    getMany: protectedProcedure.input(farmerSearchSchema).query(async ({ ctx, input }) => {
        const { search, page, pageSize, status,sortBy,sortOrder } = input;

        const whereClause = and(
            eq(farmers.userId, ctx.auth.session.userId),
            eq(farmers.status, status),
            search ? ilike(farmers.name, `%${search}%`) : undefined
        );
    let orderByClause = desc(farmers.createdAt); // Default

    if (sortBy === "name") {
        orderByClause = sortOrder === "asc" ? asc(farmers.name) : desc(farmers.name);
    } 
    else if (sortBy === "age") {
        orderByClause = sortOrder === "asc" ? asc(farmers.age) : desc(farmers.age);
    }
      const data = await db.select()
        .from(farmers)
        .where(whereClause)
        .orderBy(orderByClause) // <--- Use the dynamic clause
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
    deleteHistory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(farmerHistory)
        .where(
          and(
            eq(farmerHistory.id, input.id),
            // Ensure users can only delete their own history
            eq(farmerHistory.userId, ctx.auth.session.userId) 
          )
        );

      return { success: true };
    }),
syncFeed: protectedProcedure.mutation(async ({ ctx }) => {
    const activeFarmers = await db.select()
        .from(farmers)
        .where(and(
            eq(farmers.status, "active"),
            eq(farmers.userId, ctx.auth.session.userId)
        ));

    // Use the shared service
    const results = await Promise.all(
        activeFarmers.map(farmer => updateFarmerFeed(farmer))
    );

    const validUpdates = results.filter(r => r !== null);

    return { 
        success: true, 
        updatedCount: validUpdates.length,
        // You could even sum up bags here if needed
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
        console.log(input);

        // If we found a previous cycle, add its remaining feed
        if (latestHistory.length > 0) {
            const previousRemaining = latestHistory[0].finalRemaining;
            if (previousRemaining > 0) {
                totalInputFeed += previousRemaining;
            }
        }
const backdatedDate = new Date();
    if (input.age > 1) {
        // Subtract (Age - 1) days
        backdatedDate.setDate(backdatedDate.getDate() - (input.age - 1));
    }
        // 4. Create the new farmer with the calculated total
        const [createdFarmer] = await db.insert(farmers)
            .values({
                ...input,
                createdAt: backdatedDate,
                updatedAt: new Date(),
                inputFeed: totalInputFeed, // Stores (New Input + Old Remaining)
                userId: ctx.auth.session.userId
            })
            .returning();
        await updateFarmerFeed(createdFarmer,true   ); // Force update to set correct intake based on age
        
        // 5. Return the (potentially updated) farmer
        // To be perfectly accurate, you might want to fetch it again, 
        // or just return the initial one since the UI usually refetches anyway.
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
    // 1. Fix Syntax: Removed double comma
    const { search, page, pageSize, sortBy, sortOrder } = input;

    const whereClause = and(
        eq(farmerHistory.userId, ctx.auth.session.userId),
        search ? ilike(farmerHistory.farmerName, `%${search}%`) : undefined
    );

    // 2. Dynamic Sort Logic
    // Default to sorting by End Date (Newest first)
    let orderByClause = desc(farmerHistory.endDate);

    if (sortBy) {
        const isAsc = sortOrder === "asc";
        
        switch (sortBy) {
            case "farmerName":
                orderByClause = isAsc ? asc(farmerHistory.farmerName) : desc(farmerHistory.farmerName);
                break;
            case "age":
                orderByClause = isAsc ? asc(farmerHistory.age) : desc(farmerHistory.age);
                break;
            case "doc":
                orderByClause = isAsc ? asc(farmerHistory.doc) : desc(farmerHistory.doc);
                break;
            case "mortality":
                orderByClause = isAsc ? asc(farmerHistory.mortality) : desc(farmerHistory.mortality);
                break;
            case "finalInputFeed":
                orderByClause = isAsc ? asc(farmerHistory.finalInputFeed) : desc(farmerHistory.finalInputFeed);
                break;
            case "finalIntake":
                orderByClause = isAsc ? asc(farmerHistory.finalIntake) : desc(farmerHistory.finalIntake);
                break;
            case "finalRemaining":
                orderByClause = isAsc ? asc(farmerHistory.finalRemaining) : desc(farmerHistory.finalRemaining);
                break;
            // Note: 'timespan' is calculated on the frontend, so we cannot easily sort by it 
            // on the backend without complex SQL. We default to endDate here.
        }
    }

    const data = await db.select()
        .from(farmerHistory)
        .where(whereClause)
        .orderBy(orderByClause) // <--- Apply the dynamic sort
        .limit(pageSize)
        .offset((page - 1) * pageSize);

    const [total] = await db.select({ count: count() })
        .from(farmerHistory)
        .where(whereClause);

    const totalPages = Math.ceil(total.count / pageSize);
    
    return {
        items: data, 
        total: total.count, 
        totalPages
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
