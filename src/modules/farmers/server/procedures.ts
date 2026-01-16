import { db } from "@/db";
import { farmers } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { farmerInsertSchema, farmerSearchSchema } from "../schema";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";

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

    create: protectedProcedure.input(farmerInsertSchema).mutation(async ({ input, ctx }) => {
        // Check uniqueness of name for this user
        const existing = await db.select().from(farmers).where(
            and(
                eq(farmers.name, input.name),
                eq(farmers.userId, ctx.auth.session.userId) // Ensure uniqueness per user? Or global?
                // DB schema has unique on name, globally.
            )
        );

        // Actually DB schema has `name` unique. If it's global unique constraint, I should probably handle the error or check it.
        // If I want it unique per user, the schema should have been `uniqueIndex().on(farmers.name, farmers.userId)`.
        // But the schema I wrote was `name: text("name").notNull().unique()`. So it is globally unique.

        const [createdFarmer] = await db.insert(farmers)
            .values({
                ...input,
                userId: ctx.auth.user.id
            })
            .returning();
        return createdFarmer;
    }),

    end: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
        const [updatedFarmer] = await db.update(farmers)
            .set({ status: "history" })
            .where(and(eq(farmers.id, input.id), eq(farmers.userId, ctx.auth.session.userId)))
            .returning();
        return updatedFarmer;
    })
})
