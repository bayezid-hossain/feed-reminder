import { getCumulativeFeedForDay, GRAMS_PER_BAG } from "@/constants";
import { db } from "@/db";
import { farmerLogs, farmers, cycles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const updateCycleFeed = async (
  cycle: typeof cycles.$inferSelect,
  forceUpdate = false 
) => {
    // 1. Get Parent Farmer for Stock Deduction
    const [farmer] = await db.select().from(farmers).where(eq(farmers.id, cycle.farmerId));
    if (!farmer) return null; // Should not happen

    // 2. Calculate Age based on Date
    const now = new Date();
    const start = new Date(cycle.startDate); // Use startDate
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    
    const diffTime = now.getTime() - start.getTime();
    const currentAge = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 3. CHECKPOINT: 
    if (!forceUpdate && currentAge <= cycle.age) {
        return null; 
    }

    // 4. Calculate Cumulative Feed
    const targetCumulativeGrams = getCumulativeFeedForDay(currentAge);
    const liveBirds = Math.max(0, (cycle.doc) - cycle.mortality);
    
    const totalNewGrams = targetCumulativeGrams * liveBirds;
    const totalNewBags = totalNewGrams / GRAMS_PER_BAG;

    // --- LOGIC ADDITION START ---
    const previousIntake = Number(cycle.intake) || 0;
    const consumedAmount = totalNewBags - previousIntake;

    // 5. Update DB (Transaction recommended to keep Log + Update in sync)
    await db.transaction(async (tx) => {
        // A. Update Cycle State
        await tx.update(cycles)
            .set({
                intake: sql`${totalNewBags}`,
                age: currentAge,
                updatedAt: new Date(),
            })
            .where(eq(cycles.id, cycle.id));

        // B. Deduct from Main Stock
        if (consumedAmount > 0.001) {
            await tx.update(farmers)
                .set({
                    mainStockRemaining: sql`${farmers.mainStockRemaining} - ${consumedAmount}`,
                    updatedAt: new Date(),
                })
                .where(eq(farmers.id, farmer.id));

            // C. Add Intake Log (Linked to Cycle)
            await tx.insert(farmerLogs).values({
                cycleId: cycle.id,
                userId: cycle.userId,
                type: "FEED", // Changed to FEED as it is feed consumption
                valueChange: consumedAmount,
                previousValue: previousIntake,
                newValue: totalNewBags,
                note: `Daily Consumption: ${consumedAmount.toFixed(2)} bags (Age ${currentAge})`
            });
        }
    });
    // --- LOGIC ADDITION END ---

    return {
        farmerName: farmer.name, // Or cycle identifier
        cycleId: cycle.id,
        addedBags: consumedAmount,
        newAge: currentAge
    };
};
