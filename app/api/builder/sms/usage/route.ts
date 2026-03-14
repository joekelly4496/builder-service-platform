import { db } from "@/lib/db";
import { smsLogs, builders, homes, homeownerAccounts } from "@/lib/db/schema";
import { eq, and, gte, count, sql, countDistinct } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const builderId = searchParams.get("builderId");

    if (!builderId) {
      return NextResponse.json({ success: false, error: "builderId is required" }, { status: 400 });
    }

    // Get builder info
    const [builder] = await db
      .select({
        smsEnabled: builders.smsEnabled,
        twilioPhoneNumber: builders.twilioPhoneNumber,
      })
      .from(builders)
      .where(eq(builders.id, builderId))
      .limit(1);

    if (!builder) {
      return NextResponse.json({ success: false, error: "Builder not found" }, { status: 404 });
    }

    // Get start of current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Messages sent this month
    const [messageCount] = await db
      .select({ count: count() })
      .from(smsLogs)
      .where(
        and(
          eq(smsLogs.builderId, builderId),
          gte(smsLogs.createdAt, monthStart),
          eq(smsLogs.status, "sent")
        )
      );

    // Unique homes with SMS-opted-in homeowners
    const homesWithSms = await db
      .select({ count: countDistinct(homeownerAccounts.homeId) })
      .from(homeownerAccounts)
      .innerJoin(homes, eq(homeownerAccounts.homeId, homes.id))
      .where(
        and(
          eq(homes.builderId, builderId),
          eq(homeownerAccounts.smsOptIn, true)
        )
      );

    const activeHomes = homesWithSms[0]?.count ?? 0;

    // Calculate estimated cost: $10/mo minimum covers 3 homes, then $3/home/month
    let estimatedCostCents = 0;
    if (builder.smsEnabled) {
      if (activeHomes <= 3) {
        estimatedCostCents = 1000; // $10 minimum
      } else {
        estimatedCostCents = 1000 + (activeHomes - 3) * 300; // $10 + $3 per additional home
      }
    }

    // Total cost from actual message logs this month
    const [actualCost] = await db
      .select({ total: sql<number>`COALESCE(SUM(${smsLogs.costCents}), 0)` })
      .from(smsLogs)
      .where(
        and(
          eq(smsLogs.builderId, builderId),
          gte(smsLogs.createdAt, monthStart)
        )
      );

    return NextResponse.json({
      success: true,
      smsEnabled: builder.smsEnabled,
      twilioPhoneNumber: builder.twilioPhoneNumber,
      messagesSentThisMonth: messageCount?.count ?? 0,
      homesOnSms: activeHomes,
      estimatedMonthlyCostCents: estimatedCostCents,
      actualMessageCostCents: actualCost?.total ?? 0,
    });
  } catch (error: any) {
    console.error("SMS usage error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
