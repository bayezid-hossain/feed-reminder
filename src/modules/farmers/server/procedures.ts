import { db } from "@/db";
import { farmerHistory, farmerLogs, farmers } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike, ne, sql } from "drizzle-orm"; // Added 'ne'
import { z } from "zod";
import { addMortalitySchema, farmerInsertSchema, farmerSearchSchema } from "../schema";
import { updateFarmerFeed } from "./services/feed-service";

export const farmersRouter = createTRPCRouter({
  
  // 1. Get Many (Active List)
  getMany: protectedProcedure.input(farmerSearchSchema).query(async ({ ctx, input }) => {
    const { search, page, pageSize, status, sortBy, sortOrder } = input;

    const whereClause = and(
      eq(farmers.userId, ctx.auth.session.userId),
      eq(farmers.status, status),
      search ? ilike(farmers.name, `%${search}%`) : undefined
    );

    let orderByClause = desc(farmers.createdAt);

    if (sortBy === "name") {
      orderByClause = sortOrder === "asc" ? asc(farmers.name) : desc(farmers.name);
    } else if (sortBy === "age") {
      orderByClause = sortOrder === "asc" ? asc(farmers.age) : desc(farmers.age);
    }

    const data = await db.select()
      .from(farmers)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [total] = await db.select({ count: count() })
      .from(farmers)
      .where(whereClause);

    return {
      items: data,
      total: total.count,
      totalPages: Math.ceil(total.count / pageSize)
    };
  }),

  // 2. Delete History
  deleteHistory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(farmerHistory)
        .where(
          and(
            eq(farmerHistory.id, input.id),
            eq(farmerHistory.userId, ctx.auth.session.userId)
          )
        );
      return { success: true };
    }),

  // 3. Sync Feed
  syncFeed: protectedProcedure.mutation(async ({ ctx }) => {
    const activeFarmers = await db.select()
      .from(farmers)
      .where(and(
        eq(farmers.status, "active"),
        eq(farmers.userId, ctx.auth.session.userId)
      ));

    const results = await Promise.all(
      activeFarmers.map(farmer => updateFarmerFeed(farmer))
    );

    const validUpdates = results.filter(r => r !== null);

    return {
      success: true,
      updatedCount: validUpdates.length,
    };
  }),

  // 4. Create Farmer
create: protectedProcedure.input(farmerInsertSchema).mutation(async ({ input, ctx }) => {
    // 1. Normalize Name
    input.name = input.name.toLowerCase();

    // 2. Check for Active Duplicates
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

    // 3. Check History for Carryover Feed
    const latestHistory = await db.select()
      .from(farmerHistory)
      .where(and(
        eq(farmerHistory.farmerName, input.name),
        eq(farmerHistory.userId, ctx.auth.session.userId)
      ))
      .orderBy(desc(farmerHistory.endDate))
      .limit(1);

    // 4. Calculate Total Feed & Prepare Log Note
    let totalInputFeed = input.inputFeed;
    let feedLogNote = "Initial Stock"; // Default note

    if (latestHistory.length > 0) {
      const previousRemaining = latestHistory[0].finalRemaining;
      
      // If there is leftover feed, add it and update the note
      if (previousRemaining > 0) {
        totalInputFeed += previousRemaining;
        feedLogNote = `Initial (${input.inputFeed}) + Carryover (${previousRemaining.toFixed(2)})`;
      }
    }

    // 5. Calculate Backdated Start Date
    const backdatedDate = new Date();
    if (input.age > 1) {
      backdatedDate.setDate(backdatedDate.getDate() - (input.age - 1));
    }

    // 6. Insert the New Farmer
    const [createdFarmer] = await db.insert(farmers)
      .values({
        ...input,
        createdAt: backdatedDate,
        updatedAt: new Date(),
        inputFeed: totalInputFeed, // Stores (New Input + Old Remaining)
        userId: ctx.auth.session.userId
      })
      .returning();

    // 7. Insert Audit Logs (Cycle Start & Initial Feed)
    await db.insert(farmerLogs).values([
      // Log A: Cycle Started
      
      // Log B: Initial Feed Input (with carryover details)
      {
        farmerId: createdFarmer.id,
        userId: ctx.auth.session.userId,
        type: "FEED",
        valueChange: totalInputFeed,
        previousValue: 0,
        newValue: totalInputFeed,
        note: feedLogNote
      },{
        farmerId: createdFarmer.id,
        userId: ctx.auth.session.userId,
        type: "NOTE",
        valueChange: 0,
        previousValue: 0,
        newValue: 0,
        note: `Cycle started manually. Initial Age: ${input.age} days.`
      },
    ]);

    // 8. Trigger Initial Feed Calculation
    await updateFarmerFeed(createdFarmer, true);

    return createdFarmer;
  }),

  // 5. End Cycle (Archive)
  end: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await db.transaction(async (tx) => {
        const [farmer] = await tx.select()
          .from(farmers)
          .where(and(eq(farmers.id, input.id), eq(farmers.userId, ctx.auth.session.userId)));

        if (!farmer) throw new TRPCError({ code: "NOT_FOUND" });

        const [history] = await tx.insert(farmerHistory).values({
          farmerName: farmer.name,
          userId: ctx.auth.session.userId,
          doc: farmer.doc,
          finalInputFeed: farmer.inputFeed,
          finalIntake: farmer.intake,
          finalRemaining: farmer.inputFeed - farmer.intake,
          mortality: farmer.mortality,
          age: farmer.age,
          startDate: farmer.createdAt,
          status: "archived",
          endDate: new Date(),
        }).returning();

        // Link Logs to History
        await tx.update(farmerLogs)
          .set({ historyId: history.id })
          .where(eq(farmerLogs.farmerId, farmer.id));

        await tx.delete(farmers).where(eq(farmers.id, input.id));

        return { success: true };
      });
    }),

  // 6. Add Feed
  addFeed: protectedProcedure
    .input(z.object({
      id: z.string(), 
      amount: z.number().int(),
      note: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const [current] = await db.select().from(farmers).where(and(
        eq(farmers.id, input.id),
        eq(farmers.userId, ctx.auth.session.userId)
      ));

      if (!current) throw new TRPCError({ code: "NOT_FOUND" });

      const [updatedFarmer] = await db.update(farmers)
        .set({
          inputFeed: sql`${farmers.inputFeed} + ${input.amount}`,
          updatedAt: new Date()
        })
        .where(eq(farmers.id, input.id))
        .returning();

      await db.insert(farmerLogs).values({
        farmerId: current.id,
        userId: ctx.auth.session.userId,
        type: "FEED",
        valueChange: input.amount,
        previousValue: current.inputFeed,
        newValue: (current.inputFeed || 0) + input.amount,
        note: input.note || "Manual Entry"
      });

      return updatedFarmer;
    }),

  // 7. Get Details (The Core Logic)
// server/routers/farmers.ts

getDetails: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const userId = ctx.auth.session.userId;

    // --- SCENARIO 1: ID MATCHES ACTIVE FARMER ---
    const activeFarmer = await db.query.farmers.findFirst({
      where: and(eq(farmers.id, input.id), eq(farmers.userId, userId)),
    });

    if (activeFarmer) {
      // OPTIMIZATION: Run these two queries in parallel
      const [logs, history] = await Promise.all([
        db.select()
          .from(farmerLogs)
          .where(eq(farmerLogs.farmerId, activeFarmer.id))
          .orderBy(desc(farmerLogs.createdAt)),

        db.select()
          .from(farmerHistory)
          .where(and(
            eq(farmerHistory.farmerName, activeFarmer.name),
            eq(farmerHistory.userId, userId)
          ))
          .orderBy(desc(farmerHistory.endDate))
      ]);

      return { farmer: activeFarmer, logs, history };
    }

    // --- SCENARIO 2: ID MATCHES HISTORICAL FARMER ---
    const historicalRecord = await db.query.farmerHistory.findFirst({
      where: and(eq(farmerHistory.id, input.id), eq(farmerHistory.userId, userId)),
    });

    if (!historicalRecord) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Record not found." });
    }

    // Map History -> Standard Farmer Shape
    const mappedFarmer = {
      id: historicalRecord.id,
      name: historicalRecord.farmerName,
      doc: historicalRecord.doc,
      age: historicalRecord.age,
      inputFeed: historicalRecord.finalInputFeed,
      intake: historicalRecord.finalIntake,
      mortality: historicalRecord.mortality,
      status: "history" as const,
      userId: historicalRecord.userId,
      createdAt: historicalRecord.startDate,
      updatedAt: historicalRecord.endDate,
    };

    // OPTIMIZATION: Run Logs, Past History, and Active Check in parallel
    const [logs, pastHistory, currentActive] = await Promise.all([
      // 1. Logs
      db.select()
        .from(farmerLogs)
        .where(eq(farmerLogs.historyId, historicalRecord.id))
        .orderBy(desc(farmerLogs.createdAt)),

      // 2. Past History (excluding current)
      db.select()
        .from(farmerHistory)
        .where(and(
          eq(farmerHistory.farmerName, historicalRecord.farmerName),
          eq(farmerHistory.userId, userId),
          ne(farmerHistory.id, historicalRecord.id)
        ))
        .orderBy(desc(farmerHistory.endDate)),

      // 3. Check for Active Cycle
      db.query.farmers.findFirst({
        where: and(
          eq(farmers.name, historicalRecord.farmerName),
          eq(farmers.userId, userId)
        )
      })
    ]);

    // Add Marker Log
    const logsWithMarker = [
      {
        id: "system-end-log",
        type: "NOTE" as const,
        valueChange: 0,
        previousValue: 0,
        newValue: 0,
        note: "Cycle Ended & Archived",
        createdAt: historicalRecord.endDate
      },
      ...logs
    ];

    // Combine Lists
    let combinedHistory = [...pastHistory];
    
    if (currentActive) {
      const mappedActive = {
        id: currentActive.id,
        farmerName: currentActive.name,
        userId: currentActive.userId,
        doc: currentActive.doc,
        finalInputFeed: currentActive.inputFeed,
        finalIntake: currentActive.intake,
        finalRemaining: currentActive.inputFeed - currentActive.intake,
        mortality: currentActive.mortality,
        age: currentActive.age,
        startDate: currentActive.createdAt,
        endDate: new Date(), 
        status: "active" as const, // <--- FIX: Explicitly added status
      };
      
      // Add active cycle to the top of the list
      // @ts-ignore (TypeScript might complain about mismatching types, but safe for JSON return)
      combinedHistory = [mappedActive, ...pastHistory];
    }
    console.log("Combined History:", combinedHistory);
    return { farmer: mappedFarmer, logs: logsWithMarker, history: combinedHistory };
  }),
  // 8. Get History List
  getHistory: protectedProcedure.input(farmerSearchSchema).query(async ({ ctx, input }) => {
    const { search, page, pageSize, sortBy, sortOrder } = input;
    const whereClause = and(
      eq(farmerHistory.userId, ctx.auth.session.userId),
      search ? ilike(farmerHistory.farmerName, `%${search}%`) : undefined
    );

    let orderByClause = desc(farmerHistory.endDate);
    // ... (Sort switch logic same as before) ...
    if (sortBy) {
        const isAsc = sortOrder === "asc";
        switch (sortBy) {
          case "farmerName": orderByClause = isAsc ? asc(farmerHistory.farmerName) : desc(farmerHistory.farmerName); break;
          case "age": orderByClause = isAsc ? asc(farmerHistory.age) : desc(farmerHistory.age); break;
          // ... add other cases if needed
        }
      }

    const data = await db.select()
      .from(farmerHistory)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [total] = await db.select({ count: count() })
      .from(farmerHistory)
      .where(whereClause);

    return {
      items: data,
      total: total.count,
      totalPages: Math.ceil(total.count / pageSize)
    };
  }),

  // 9. Add Mortality
  addMortality: protectedProcedure
    .input(addMortalitySchema)
    .mutation(async ({ input, ctx }) => {
      const [current] = await db.select().from(farmers).where(and(
        eq(farmers.id, input.id),
        eq(farmers.userId, ctx.auth.session.userId)
      ));
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });

      const [updatedFarmer] = await db.update(farmers)
        .set({
          mortality: sql`${farmers.mortality} + ${input.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(farmers.id, input.id))
        .returning();

      await db.insert(farmerLogs).values({
        farmerId: input.id,
        userId: ctx.auth.session.userId,
        type: "MORTALITY",
        valueChange: input.amount,
        previousValue: current.mortality,
        newValue: current.mortality + input.amount,
        note: input.reason || "Routine Check"
      });

      return updatedFarmer;
    }),

  // 10. History Suggestion
  getHistorySuggestion: protectedProcedure.input(farmerSearchSchema).query(async ({ ctx, input }) => {
    const { search, page, pageSize } = input;
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
    return { items: data, total, totalPages: Math.ceil(total / pageSize) };
  })
});