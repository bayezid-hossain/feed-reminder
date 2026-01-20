// app/api/cron/update-feed/route.ts
import { db } from "@/db";
import { farmers } from "@/db/schema";
import { updateFarmerFeed } from "@/modules/farmers/server/services/feed-service";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get("userId");

    const whereClause = targetUserId 
      ? and(eq(farmers.status, "active"), eq(farmers.userId, targetUserId))
      : eq(farmers.status, "active");

const activeFarmers = await db.select().from(farmers).where(whereClause);

const results = await Promise.all(
    activeFarmers.map(farmer => updateFarmerFeed(farmer))
);

const validUpdates = results.filter(r => r !== null);

return NextResponse.json({ 
    success: true, 
    count: validUpdates.length, 
    updates: validUpdates 
});

  } catch (error) {
    console.error("Cron Job Failed:", error);
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
  }
}