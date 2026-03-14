import { db } from "@/lib/db";
import { homeownerAccounts, homeownerSubscriptions, invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    // Get homeowner account
    const [account] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.supabaseUserId, userId))
      .limit(1);

    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    // Get active subscription
    const [subscription] = await db
      .select()
      .from(homeownerSubscriptions)
      .where(eq(homeownerSubscriptions.homeId, account.homeId))
      .limit(1);

    // Get invoices
    const homeInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.homeId, account.homeId))
      .orderBy(invoices.createdAt);

    return NextResponse.json({
      success: true,
      subscription: subscription ?? null,
      invoices: homeInvoices,
    });
  } catch (error: any) {
    console.error("Homeowner billing error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
