import { db } from "@/lib/db";
import { smsLogs, builders, homes, homeownerAccounts } from "@/lib/db/schema";
import { eq, and, gte, count, sql, countDistinct } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

export async function GET(request: NextRequest) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const builderId = builder.id;

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

    // Calculate estimated wholesale cost: $5/home/month + $0.02/message
    const messagesSent = messageCount?.count ?? 0;
    let estimatedCostCents = 0;
    if (builder.smsEnabled) {
      estimatedCostCents = (activeHomes * 500) + (messagesSent * 2); // $5/home + $0.02/message
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
