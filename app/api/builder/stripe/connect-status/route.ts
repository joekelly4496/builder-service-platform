import { db } from "@/lib/db";
import { builders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { stripeRequest } from "@/lib/stripe/client";

/**
 * GET: Check the status of a builder's Stripe Connect account.
 */
export async function GET(request: NextRequest) {
  try {
    const builderId = request.nextUrl.searchParams.get("builderId");

    if (!builderId) {
      return NextResponse.json({ success: false, error: "builderId is required" }, { status: 400 });
    }

    const [builder] = await db
      .select({
        stripeConnectAccountId: builders.stripeConnectAccountId,
        companyName: builders.companyName,
      })
      .from(builders)
      .where(eq(builders.id, builderId))
      .limit(1);

    if (!builder) {
      return NextResponse.json({ success: false, error: "Builder not found" }, { status: 404 });
    }

    if (!builder.stripeConnectAccountId) {
      return NextResponse.json({
        success: true,
        connected: false,
        onboardingComplete: false,
      });
    }

    // Fetch account details from Stripe
    const account = await stripeRequest(`/accounts/${builder.stripeConnectAccountId}`);

    return NextResponse.json({
      success: true,
      connected: true,
      accountId: builder.stripeConnectAccountId,
      onboardingComplete: account.details_submitted ?? false,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
    });
  } catch (error: any) {
    console.error("Connect status error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
