import { getCumulativeFeedForDay, GRAMS_PER_BAG } from "@/constants";
import { db } from "@/db";
import { farmerLogs, farmers } from "@/db/schema"; // 1. Import farmerLogs
import { eq, sql } from "drizzle-orm";

export const updateFarmerFeed = async (
  farmer: typeof farmers.$inferSelect, 
  forceUpdate = false 
) => {
    // 2. Calculate Age based on Date
    const now = new Date();
    const start = new Date(farmer.createdAt);
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    
    const diffTime = now.getTime() - start.getTime();
    const currentAge = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 3. CHECKPOINT: 
    if (!forceUpdate && currentAge <= farmer.age) {
        return null; 
    }

    // 4. Calculate Cumulative Feed
    const targetCumulativeGrams = getCumulativeFeedForDay(currentAge);
    const liveBirds = Math.max(0, (farmer.doc) - farmer.mortality);
    
    const totalNewGrams = targetCumulativeGrams * liveBirds;
    const totalNewBags = totalNewGrams / GRAMS_PER_BAG;

    // --- LOGIC ADDITION START ---
    const previousIntake = Number(farmer.intake) || 0;
    const consumedAmount = totalNewBags - previousIntake;

    // 5. Update DB (Transaction recommended to keep Log + Update in sync)
    await db.transaction(async (tx) => {
        // A. Update Farmer State
        await tx.update(farmers)
            .set({
                intake: sql`${totalNewBags}`,
                age: currentAge,
                updatedAt: new Date(),
            })
            .where(eq(farmers.id, farmer.id));

        // B. Add Intake Log (Only if there was consumption)
        if (consumedAmount > 0.001) {
            await tx.insert(farmerLogs).values({
                farmerId: farmer.id,
                userId: farmer.userId,
                type: "NOTE", // Using NOTE prevents it from looking like "Added Stock" in UI
                valueChange: consumedAmount,
                previousValue: previousIntake,
                newValue: totalNewBags,
                note: `Daily Consumption: ${consumedAmount.toFixed(2)} bags (Age ${currentAge})`
            });
        }
    });
    // --- LOGIC ADDITION END ---

    return {
        farmerName: farmer.name,
        addedBags: consumedAmount,
        newAge: currentAge
    };
};