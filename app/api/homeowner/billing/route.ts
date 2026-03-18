import { db } from "@/lib/db";
import { homeownerAccounts, homeownerSubscriptions, invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedHomeowner } from "@/lib/utils/homeowner-auth";

export async function GET(request: NextRequest) {
  try {
    const result = await getAuthenticatedHomeowner();
    if (!result) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { account } = result;

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
