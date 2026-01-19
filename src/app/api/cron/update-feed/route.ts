// app/api/cron/update-feed/route.ts
import { db } from "@/db";
import { farmers } from "@/db/schema";
import { getFeedForDay, GRAMS_PER_BAG } from "@/lib/constants";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 1. Check for specific User ID in query params
    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get("userId");

    // 2. Build the WHERE clause dynamically
    // If targetUserId exists, we filter by User AND Status. 
    // Otherwise, we just filter by Status (Global Cron).
    const whereClause = targetUserId 
      ? and(eq(farmers.status, "active"), eq(farmers.userId, targetUserId))
      : eq(farmers.status, "active");

    const activeFarmers = await db.select()
      .from(farmers)
      .where(whereClause);

    const updates = activeFarmers.map(async (farmer) => {
      // A. Calculate Age
      const now = new Date();
      const start = new Date(farmer.createdAt);
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const currentAge = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      // Idempotency check: If age hasn't changed since last update, skip
      if (currentAge <= farmer.age) {
        return null; // Return null to filter out later
      }

      // B. Get Feed Per Bird (Grams)
      const gramsPerBird = getFeedForDay(currentAge);
      const birdCount = parseInt(farmer.doc) || 0;
      
      // C. Calculate Totals (Subtracting Mortality for accuracy)
      const liveBirds = Math.max(0, birdCount - farmer.mortality);
      const totalDailyGrams = gramsPerBird * liveBirds;
      
      // CONVERSION: Grams -> Bags
      const totalDailyBags = totalDailyGrams / GRAMS_PER_BAG;

      // D. Update Database
      await db.update(farmers)
        .set({
          intake: sql`${farmers.intake} + ${totalDailyBags}`,
          age: currentAge,
          updatedAt: new Date(),
        })
        .where(eq(farmers.id, farmer.id));
        
      return {
        name: farmer.name,
        age: currentAge,
        addedBags: totalDailyBags
      };
    });

    const results = await Promise.all(updates);
    
    // Filter out nulls (skipped farmers) to get actual update count
    const validUpdates = results.filter((r) => r !== null);

    return NextResponse.json({ 
      success: true, 
      mode: targetUserId ? `User Sync (${targetUserId})` : "Global Server Update",
      count: validUpdates.length,
      updates: validUpdates 
    });

  } catch (error) {
    console.error("Cron Job Failed:", error);
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
  }
}