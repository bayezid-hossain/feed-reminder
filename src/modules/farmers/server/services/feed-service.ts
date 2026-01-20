import { getCumulativeFeedForDay, GRAMS_PER_BAG } from "@/constants";
import { db } from "@/db";
import { farmers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// 1. Add 'forceUpdate' parameter (defaults to false)
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
    // If NOT forced AND age hasn't advanced, skip it.
    if (!forceUpdate && currentAge <= farmer.age) {
        return null; 
    }

    // 4. Calculate Cumulative Feed
    const targetCumulativeGrams = getCumulativeFeedForDay(currentAge);
    const liveBirds = Math.max(0, parseInt(farmer.doc) - farmer.mortality);
    
    const totalNewGrams = targetCumulativeGrams * liveBirds;
    const totalNewBags = totalNewGrams / GRAMS_PER_BAG;

    // 5. Update DB
    await db.update(farmers)
        .set({
            intake: sql`${totalNewBags}`, // Overwrite with correct cumulative total
            age: currentAge,
            updatedAt: new Date(),
        })
        .where(eq(farmers.id, farmer.id));

    return {
        farmerName: farmer.name,
        addedBags: totalNewBags - (Number(farmer.intake) || 0),
        newAge: currentAge
    };
};