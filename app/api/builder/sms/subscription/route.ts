import { db } from "@/lib/db";
import { builders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * Create or update the SMS add-on subscription for a builder via Stripe.
 * This adds the SMS line item to the builder's existing Stripe subscription.
 *
 * Pricing: $10/mo minimum (covers 3 homes), $3/home/month for each additional.
 * Uses Stripe metered billing tied to active home count.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { builderId, activeHomeCount } = body;

    if (!builderId) {
      return NextResponse.json({ success: false, error: "builderId is required" }, { status: 400 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ success: false, error: "Stripe not configured" }, { status: 500 });
    }

    const [builder] = await db
      .select()
      .from(builders)
      .where(eq(builders.id, builderId))
      .limit(1);

    if (!builder) {
      return NextResponse.json({ success: false, error: "Builder not found" }, { status: 404 });
    }

    if (!builder.stripeSubscriptionId) {
      return NextResponse.json({
        success: false,
        error: "Builder does not have an active Stripe subscription. Please set up billing first.",
      }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // Calculate SMS add-on price in cents
    // $10/mo base covers 3 homes, $3/mo per additional home
    const homes = activeHomeCount ?? 0;
    const monthlyCostCents = homes <= 3 ? 1000 : 1000 + (homes - 3) * 300;

    if (builder.stripeSmsSubscriptionItemId) {
      // Update existing SMS subscription item with new quantity/amount
      const updateUrl = `https://api.stripe.com/v1/subscription_items/${builder.stripeSmsSubscriptionItemId}`;
      const updateBody = new URLSearchParams({
        quantity: "1",
        "price_data[currency]": "usd",
        "price_data[product]": "sms_addon",
        "price_data[unit_amount]": String(monthlyCostCents),
        "price_data[recurring][interval]": "month",
      });

      const updateResponse = await fetch(updateUrl, {
        method: "POST",
        headers,
        body: updateBody.toString(),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        return NextResponse.json({ success: false, error: error.error?.message || "Failed to update SMS subscription" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        monthlyCostCents,
        message: "SMS subscription updated",
      });
    }

    // Create a new SMS line item on the existing subscription
    const addItemUrl = "https://api.stripe.com/v1/subscription_items";
    const addItemBody = new URLSearchParams({
      subscription: builder.stripeSubscriptionId,
      quantity: "1",
      "price_data[currency]": "usd",
      "price_data[product]": "sms_addon",
      "price_data[unit_amount]": String(monthlyCostCents),
      "price_data[recurring][interval]": "month",
    });

    const addResponse = await fetch(addItemUrl, {
      method: "POST",
      headers,
      body: addItemBody.toString(),
    });

    const addResult = await addResponse.json();

    if (!addResponse.ok) {
      return NextResponse.json({
        success: false,
        error: addResult.error?.message || "Failed to add SMS subscription item",
      }, { status: 500 });
    }

    // Store the subscription item ID for future updates
    await db
      .update(builders)
      .set({
        stripeSmsSubscriptionItemId: addResult.id,
        updatedAt: new Date(),
      })
      .where(eq(builders.id, builderId));

    return NextResponse.json({
      success: true,
      subscriptionItemId: addResult.id,
      monthlyCostCents,
      message: "SMS add-on subscription created",
    });
  } catch (error: any) {
    console.error("SMS subscription error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Check current SMS subscription status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const builderId = searchParams.get("builderId");

    if (!builderId) {
      return NextResponse.json({ success: false, error: "builderId is required" }, { status: 400 });
    }

    const [builder] = await db
      .select({
        smsEnabled: builders.smsEnabled,
        stripeSubscriptionId: builders.stripeSubscriptionId,
        stripeSmsSubscriptionItemId: builders.stripeSmsSubscriptionItemId,
      })
      .from(builders)
      .where(eq(builders.id, builderId))
      .limit(1);

    if (!builder) {
      return NextResponse.json({ success: false, error: "Builder not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      smsEnabled: builder.smsEnabled,
      hasStripeSubscription: !!builder.stripeSubscriptionId,
      hasSmsSubscriptionItem: !!builder.stripeSmsSubscriptionItemId,
    });
  } catch (error: any) {
    console.error("SMS subscription check error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
