import { db } from "@/db";
import { farmers, cycles, farmerLogs } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import {
  addMortalitySchema,
  addStockSchema,
  createFarmerSchema,
  farmerSearchSchema,
  startCycleSchema,
  cycleSearchSchema
} from "../schema";
import { updateCycleFeed } from "./services/feed-service";

export const farmersRouter = createTRPCRouter({

  // 1. Get Main Stock List (Farmers)
  getMany: protectedProcedure.input(farmerSearchSchema).query(async ({ ctx, input }) => {
    const { search, page, pageSize, sortBy, sortOrder } = input;

    const whereClause = and(
      eq(farmers.userId, ctx.auth.session.userId),
      search ? ilike(farmers.name, `%${search}%`) : undefined
    );

    let orderByClause = desc(farmers.createdAt);

    if (sortBy === "name") {
      orderByClause = sortOrder === "asc" ? asc(farmers.name) : desc(farmers.name);
    } else if (sortBy === "stock") {
      orderByClause = sortOrder === "asc" ? asc(farmers.mainStockRemaining) : desc(farmers.mainStockRemaining);
    }

    const data = await db.select({
        id: farmers.id,
        name: farmers.name,
        mainStockInput: farmers.mainStockInput,
        mainStockRemaining: farmers.mainStockRemaining,
        activeCyclesCount: sql<number>`(SELECT count(*) FROM ${cycles} WHERE ${cycles.farmerId} = ${farmers.id} AND ${cycles.status} = 'active')`,
        totalIntake: sql<number>`(SELECT COALESCE(SUM(${cycles.intake}), 0) FROM ${cycles} WHERE ${cycles.farmerId} = ${farmers.id})`
      })
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

  // 2. Create Farmer (Main Stock Entity)
  create: protectedProcedure.input(createFarmerSchema).mutation(async ({ input, ctx }) => {
    // Check for duplicates
    const existing = await db.select().from(farmers).where(and(
      eq(farmers.name, input.name),
      eq(farmers.userId, ctx.auth.session.userId)
    )).limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A farmer with this name already exists."
      });
    }

    const [created] = await db.insert(farmers).values({
      name: input.name,
      userId: ctx.auth.session.userId,
      mainStockInput: 0,
      mainStockRemaining: 0,
    }).returning();

    return created;
  }),

  // 3. Add Stock
  addStock: protectedProcedure.input(addStockSchema).mutation(async ({ input, ctx }) => {
    const [farmer] = await db.select().from(farmers).where(and(
      eq(farmers.id, input.farmerId),
      eq(farmers.userId, ctx.auth.session.userId)
    ));

    if (!farmer) throw new TRPCError({ code: "NOT_FOUND" });

    await db.transaction(async (tx) => {
      // Update Farmer
      await tx.update(farmers)
        .set({
          mainStockInput: sql`${farmers.mainStockInput} + ${input.amount}`,
          mainStockRemaining: sql`${farmers.mainStockRemaining} + ${input.amount}`,
          updatedAt: new Date()
        })
        .where(eq(farmers.id, input.farmerId));
      
      // Log
      await tx.insert(farmerLogs).values({
        farmerId: input.farmerId,
        userId: ctx.auth.session.userId,
        type: "STOCK_ADD",
        valueChange: input.amount,
        previousValue: farmer.mainStockRemaining,
        newValue: farmer.mainStockRemaining + input.amount,
        note: input.note || "Stock Added"
      });
    });

    return { success: true };
  }),

  // 4. Start Cycle
  startCycle: protectedProcedure.input(startCycleSchema).mutation(async ({ input, ctx }) => {
    const [farmer] = await db.select().from(farmers).where(and(
      eq(farmers.id, input.farmerId),
      eq(farmers.userId, ctx.auth.session.userId)
    ));

    if (!farmer) throw new TRPCError({ code: "NOT_FOUND", message: "Farmer not found" });

    // Backdate calculation
    const backdatedDate = new Date();
    if (input.age > 1) {
      backdatedDate.setDate(backdatedDate.getDate() - (input.age - 1));
    }

    const [cycle] = await db.insert(cycles).values({
      farmerId: input.farmerId,
      userId: ctx.auth.session.userId,
      doc: input.doc,
      age: input.age,
      startDate: backdatedDate,
      status: "active",
      intake: 0,
      mortality: 0,
    }).returning();

    // Log Start
    await db.insert(farmerLogs).values({
      cycleId: cycle.id,
      userId: ctx.auth.session.userId,
      type: "NOTE",
      valueChange: 0,
      previousValue: 0,
      newValue: 0,
      note: `Cycle started. Initial Age: ${input.age}. DOC: ${input.doc}`
    });

    // Trigger initial feed update?
    await updateCycleFeed(cycle, true);

    return cycle;
  }),

  // 5. Get Cycles (for a farmer or all)
  getCycles: protectedProcedure.input(cycleSearchSchema).query(async ({ ctx, input }) => {
     const { farmerId, status, page, pageSize, search } = input;

     const whereClause = and(
       farmerId ? eq(cycles.farmerId, farmerId) : undefined,
       eq(cycles.userId, ctx.auth.session.userId),
       status !== "all" ? eq(cycles.status, status) : undefined,
       search ? ilike(farmers.name, `%${search}%`) : undefined
     );

     const data = await db.select({
       id: cycles.id,
       farmerId: cycles.farmerId,
       farmerName: farmers.name, // "Name" column for the table
       doc: cycles.doc,
       age: cycles.age,
       intake: cycles.intake,
       mortality: cycles.mortality,
       status: cycles.status,
       startDate: cycles.startDate,
       endDate: cycles.endDate,
     })
       .from(cycles)
       .innerJoin(farmers, eq(cycles.farmerId, farmers.id))
       .where(whereClause)
       .orderBy(desc(cycles.createdAt))
       .limit(pageSize)
       .offset((page - 1) * pageSize);

     const [total] = await db.select({ count: count() })
        .from(cycles)
        .where(whereClause);

     return {
       items: data,
       total: total.count,
       totalPages: Math.ceil(total.count / pageSize)
     };
  }),

  // 6. Get Details (Cycle + Parent Farmer + Logs + History)
  getDetails: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    // 1. Get Cycle
    const [cycle] = await db.select().from(cycles).where(and(
      eq(cycles.id, input.id),
      eq(cycles.userId, ctx.auth.session.userId)
    ));

    if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });

    // 2. Get Parent Farmer (Stock)
    const [farmer] = await db.select().from(farmers).where(eq(farmers.id, cycle.farmerId));

    // 3. Get Logs
    const logs = await db.select()
      .from(farmerLogs)
      .where(eq(farmerLogs.cycleId, cycle.id))
      .orderBy(desc(farmerLogs.createdAt));

    // 4. Get History (Other cycles for this farmer)
    const history = await db.select()
       .from(cycles)
       .where(and(
         eq(cycles.farmerId, farmer.id),
         eq(cycles.status, "archived")
       ))
       .orderBy(desc(cycles.endDate));

    return {
      cycle,
      farmer, // Main Stock Entity
      logs,
      history // List of archived cycles
    };
  }),

  // 7. Add Mortality
  addMortality: protectedProcedure.input(addMortalitySchema).mutation(async ({ input, ctx }) => {
    const [cycle] = await db.select().from(cycles).where(and(
      eq(cycles.id, input.cycleId),
      eq(cycles.userId, ctx.auth.session.userId)
    ));

    if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });

    await db.transaction(async (tx) => {
      await tx.update(cycles)
        .set({
          mortality: sql`${cycles.mortality} + ${input.amount}`,
          updatedAt: new Date()
        })
        .where(eq(cycles.id, input.cycleId));

      await tx.insert(farmerLogs).values({
        cycleId: input.cycleId,
        userId: ctx.auth.session.userId,
        type: "MORTALITY",
        valueChange: input.amount,
        previousValue: cycle.mortality,
        newValue: cycle.mortality + input.amount,
        note: input.reason || "Reported Mortality"
      });
    });

    return { success: true };
  }),

  // 8. End Cycle
  endCycle: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const [cycle] = await db.select().from(cycles).where(and(
      eq(cycles.id, input.id),
      eq(cycles.userId, ctx.auth.session.userId)
    ));

    if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });

    await db.update(cycles)
      .set({
        status: "archived",
        endDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(cycles.id, input.id));

    await db.insert(farmerLogs).values({
      cycleId: input.id,
      userId: ctx.auth.session.userId,
      type: "NOTE",
      valueChange: 0,
      previousValue: 0,
      newValue: 0,
      note: "Cycle Ended & Archived"
    });

    return { success: true };
  }),

  // 9. Sync Feed
  syncFeed: protectedProcedure.mutation(async ({ ctx }) => {
    const activeCycles = await db.select()
      .from(cycles)
      .where(and(
        eq(cycles.status, "active"),
        eq(cycles.userId, ctx.auth.session.userId)
      ));

    const results = await Promise.all(
      activeCycles.map(cycle => updateCycleFeed(cycle))
    );

    const validUpdates = results.filter(r => r !== null);

    return {
      success: true,
      updatedCount: validUpdates.length,
    };
  }),

    // 10. Get History List
  getHistory: protectedProcedure.input(farmerSearchSchema).query(async ({ ctx, input }) => {
    const { search, page, pageSize, sortBy, sortOrder } = input;

    // Search by farmer name requires join
    const whereClause = and(
      eq(cycles.userId, ctx.auth.session.userId),
      eq(cycles.status, "archived"),
      search ? ilike(farmers.name, `%${search}%`) : undefined
    );

    let orderByClause = desc(cycles.endDate);

    if (sortBy === "name") {
         orderByClause = sortOrder === "asc" ? asc(farmers.name) : desc(farmers.name);
    }

    const data = await db.select({
      id: cycles.id,
      farmerName: farmers.name,
      doc: cycles.doc,
      age: cycles.age,
      finalIntake: cycles.intake,
      finalRemaining: sql<number>`0`,
      mortality: cycles.mortality,
      startDate: cycles.startDate,
      endDate: cycles.endDate,
    })
      .from(cycles)
      .innerJoin(farmers, eq(cycles.farmerId, farmers.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [total] = await db.select({ count: count() })
      .from(cycles)
      .innerJoin(farmers, eq(cycles.farmerId, farmers.id))
      .where(whereClause);

    return {
      items: data,
      total: total.count,
      totalPages: Math.ceil(total.count / pageSize)
    };
  }),

  // 11. Delete Cycle
  deleteCycle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(cycles)
        .where(
          and(
            eq(cycles.id, input.id),
            eq(cycles.userId, ctx.auth.session.userId)
          )
        );
      return { success: true };
    }),

});
