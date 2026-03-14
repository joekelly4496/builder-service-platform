import { db } from "@/lib/db";
import { builders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { stripeRequest } from "@/lib/stripe/client";

/**
 * POST: Create a Stripe Connect Express account for the builder
 * and return an onboarding link.
 */
export async function POST(request: NextRequest) {
  try {
    const { builderId } = await request.json();

    if (!builderId) {
      return NextResponse.json({ success: false, error: "builderId is required" }, { status: 400 });
    }

    const [builder] = await db
      .select()
      .from(builders)
      .where(eq(builders.id, builderId))
      .limit(1);

    if (!builder) {
      return NextResponse.json({ success: false, error: "Builder not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // If builder already has a Connect account, create a new account link
    if (builder.stripeConnectAccountId) {
      const accountLink = await stripeRequest("/account_links", "POST", {
        account: builder.stripeConnectAccountId,
        refresh_url: `${baseUrl}/dashboard/billing`,
        return_url: `${baseUrl}/dashboard/billing?connect=success`,
        type: "account_onboarding",
      });

      return NextResponse.json({
        success: true,
        url: accountLink.url,
        accountId: builder.stripeConnectAccountId,
        alreadyCreated: true,
      });
    }

    // Create a new Connect Express account
    const account = await stripeRequest("/accounts", "POST", {
      type: "express",
      country: "US",
      email: builder.email,
      "capabilities[card_payments][requested]": "true",
      "capabilities[transfers][requested]": "true",
      "business_profile[name]": builder.companyName,
      "metadata[builderId]": builderId,
    });

    // Store the Connect account ID
    await db
      .update(builders)
      .set({
        stripeConnectAccountId: account.id,
        updatedAt: new Date(),
      })
      .where(eq(builders.id, builderId));

    // Create an account link for onboarding
    const accountLink = await stripeRequest("/account_links", "POST", {
      account: account.id,
      refresh_url: `${baseUrl}/dashboard/billing`,
      return_url: `${baseUrl}/dashboard/billing?connect=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      accountId: account.id,
    });
  } catch (error: any) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
