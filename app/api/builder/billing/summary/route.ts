import { db } from "@/lib/db";
import { homeownerSubscriptions, invoices, homes, smsLogs, homeownerAccounts } from "@/lib/db/schema";
import { eq, and, gte, count, sql, countDistinct } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const builderId = request.nextUrl.searchParams.get("builderId");
    if (!builderId) {
      return NextResponse.json({ success: false, error: "builderId required" }, { status: 400 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Active subscriptions
    const activeSubs = await db
      .select({
        subscription: homeownerSubscriptions,
        home: homes,
      })
      .from(homeownerSubscriptions)
      .innerJoin(homes, eq(homeownerSubscriptions.homeId, homes.id))
      .where(
        and(
          eq(homeownerSubscriptions.builderId, builderId),
          eq(homeownerSubscriptions.status, "active")
        )
      );

    // MRR from subscriptions
    const mrr = activeSubs.reduce((sum, s) => {
      let monthly = s.subscription.monthlyPriceCents;
      if (s.subscription.smsAddonEnabled && s.subscription.smsAddonPriceCents) {
        monthly += s.subscription.smsAddonPriceCents;
      }
      return sum + monthly;
    }, 0);

    // Invoices this month
    const monthInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.builderId, builderId),
          gte(invoices.createdAt, monthStart)
        )
      );

    const invoicesSent = monthInvoices.length;
    const invoicesPaid = monthInvoices.filter(i => i.status === "paid").length;
    const totalCollectedCents = monthInvoices
      .filter(i => i.status === "paid")
      .reduce((sum, i) => sum + i.totalCents, 0);

    // SMS usage this month (builder's wholesale cost)
    const [smsCount] = await db
      .select({ count: count() })
      .from(smsLogs)
      .where(
        and(
          eq(smsLogs.builderId, builderId),
          gte(smsLogs.createdAt, monthStart),
          eq(smsLogs.status, "sent")
        )
      );

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

    const smsHomeCount = homesWithSms[0]?.count ?? 0;
    const messageCount = smsCount?.count ?? 0;

    // Homefront bill to builder: $5/home/month for SMS + $0.02/message
    const homefrontSmsCostCents = (smsHomeCount * 500) + (messageCount * 2);

    // Platform fee revenue (10% of homeowner charges)
    const platformFeeCents = Math.round(mrr * 0.10);

    // Net revenue to builder (90% of MRR + invoice revenue - homefront costs)
    const netRevenueCents = Math.round(mrr * 0.90) + totalCollectedCents - homefrontSmsCostCents;

    // Per-homeowner breakdown
    const homeownerBreakdown = activeSubs.map(s => ({
      homeId: s.home.id,
      address: s.home.address,
      homeownerName: s.home.homeownerName,
      monthlyPriceCents: s.subscription.monthlyPriceCents,
      smsAddonEnabled: s.subscription.smsAddonEnabled,
      smsAddonPriceCents: s.subscription.smsAddonPriceCents,
      status: s.subscription.status,
      nextBillingDate: s.subscription.nextBillingDate,
      billingAnchorDay: s.subscription.billingAnchorDay,
    }));

    return NextResponse.json({
      success: true,
      // Revenue Summary
      activeSubscriptions: activeSubs.length,
      mrrCents: mrr,
      invoicesSent,
      invoicesPaid,
      totalCollectedCents,
      platformFeeCents,
      netRevenueCents,
      // Homefront Bill
      homefrontSmsCostCents,
      smsHomeCount,
      messageCount,
      // Homeowner breakdown
      homeownerBreakdown,
    });
  } catch (error: any) {
    console.error("Billing summary error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
