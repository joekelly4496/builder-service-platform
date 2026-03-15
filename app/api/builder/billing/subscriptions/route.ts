import { db } from "@/lib/db";
import { homeownerSubscriptions, homes, builders, builderPricing, homeownerAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { stripeRequest } from "@/lib/stripe/client";

/**
 * GET: List all homeowner subscriptions for a builder.
 */
export async function GET(request: NextRequest) {
  try {
    const builderId = request.nextUrl.searchParams.get("builderId");
    if (!builderId) {
      return NextResponse.json({ success: false, error: "builderId required" }, { status: 400 });
    }

    const subs = await db
      .select({
        subscription: homeownerSubscriptions,
        home: homes,
      })
      .from(homeownerSubscriptions)
      .innerJoin(homes, eq(homeownerSubscriptions.homeId, homes.id))
      .where(eq(homeownerSubscriptions.builderId, builderId))
      .orderBy(homeownerSubscriptions.createdAt);

    return NextResponse.json({ success: true, subscriptions: subs });
  } catch (error: any) {
    console.error("List subscriptions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: Create a homeowner subscription for a specific home.
 * Sets up billing in Stripe with anchor date and Connect destination.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { builderId, homeId, billingStartDate, smsAddonEnabled } = body;

    if (!builderId || !homeId || !billingStartDate) {
      return NextResponse.json({ success: false, error: "builderId, homeId, and billingStartDate are required" }, { status: 400 });
    }

    // Get builder + connect account
    const [builder] = await db
      .select()
      .from(builders)
      .where(eq(builders.id, builderId))
      .limit(1);

    if (!builder?.stripeConnectAccountId) {
      return NextResponse.json({ success: false, error: "Builder must connect Stripe account first" }, { status: 400 });
    }

    // Get builder pricing
    const [pricing] = await db
      .select()
      .from(builderPricing)
      .where(eq(builderPricing.builderId, builderId))
      .limit(1);

    const portalPrice = pricing?.portalAccessMonthlyPrice ?? 1500;
    const smsPrice = pricing?.smsAddonMonthlyPrice ?? 1000;
    const perMsgPrice = pricing?.perMessagePrice ?? 5;

    // Get home details
    const [home] = await db.select().from(homes).where(eq(homes.id, homeId)).limit(1);
    if (!home) {
      return NextResponse.json({ success: false, error: "Home not found" }, { status: 404 });
    }

    // Check for existing subscription
    const [existing] = await db
      .select()
      .from(homeownerSubscriptions)
      .where(and(eq(homeownerSubscriptions.homeId, homeId), eq(homeownerSubscriptions.builderId, builderId)))
      .limit(1);

    if (existing && existing.status !== "cancelled") {
      return NextResponse.json({ success: false, error: "Active subscription already exists for this home" }, { status: 400 });
    }

    // Calculate billing anchor day from start date
    const startDate = new Date(billingStartDate);
    const anchorDay = Math.min(startDate.getDate(), 28); // Cap at 28 for safety

    // Create Stripe customer for the homeowner
    const customer = await stripeRequest("/customers", "POST", {
      email: home.homeownerEmail,
      name: home.homeownerName,
      "metadata[homeId]": homeId,
      "metadata[builderId]": builderId,
    });

    // Create a price for portal access
    const portalPriceObj = await stripeRequest("/prices", "POST", {
      currency: "usd",
      unit_amount: String(portalPrice),
      "recurring[interval]": "month",
      "product_data[name]": `Portal Access - ${home.address}`,
      "metadata[type]": "portal_access",
      "metadata[homeId]": homeId,
    });

    // Build subscription items
    const subParams: Record<string, string> = {
      customer: customer.id,
      "items[0][price]": portalPriceObj.id,
      billing_cycle_anchor: String(Math.floor(startDate.getTime() / 1000)),
      proration_behavior: "none",
      "payment_settings[save_default_payment_method]": "on_subscription",
      collection_method: "charge_automatically",
      "transfer_data[destination]": builder.stripeConnectAccountId,
      application_fee_percent: "10",
      "metadata[homeId]": homeId,
      "metadata[builderId]": builderId,
    };

    // Add SMS add-on if enabled
    if (smsAddonEnabled) {
      const smsPriceObj = await stripeRequest("/prices", "POST", {
        currency: "usd",
        unit_amount: String(smsPrice),
        "recurring[interval]": "month",
        "product_data[name]": `SMS Add-on - ${home.address}`,
        "metadata[type]": "sms_addon",
        "metadata[homeId]": homeId,
      });
      subParams["items[1][price]"] = smsPriceObj.id;

      // Create a metered price for per-message charges
      const msgPriceObj = await stripeRequest("/prices", "POST", {
        currency: "usd",
        unit_amount: String(perMsgPrice),
        "recurring[interval]": "month",
        "recurring[usage_type]": "metered",
        "product_data[name]": `SMS Messages - ${home.address}`,
        "metadata[type]": "sms_per_message",
        "metadata[homeId]": homeId,
      });
      subParams["items[2][price]"] = msgPriceObj.id;
    }

    // Create the Stripe subscription
    const subscription = await stripeRequest("/subscriptions", "POST", subParams);

    // Get homeowner account if exists
    const [hoAccount] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.homeId, homeId))
      .limit(1);

    // Store subscription in our DB
    const [sub] = await db.insert(homeownerSubscriptions).values({
      homeId,
      builderId,
      homeownerAccountId: hoAccount?.id ?? null,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      status: "pending",
      monthlyPriceCents: portalPrice,
      smsAddonEnabled: smsAddonEnabled ?? false,
      smsAddonPriceCents: smsAddonEnabled ? smsPrice : null,
      perMessagePriceCents: smsAddonEnabled ? perMsgPrice : null,
      billingStartDate: startDate,
      billingAnchorDay: anchorDay,
      nextBillingDate: startDate,
    }).returning();

    return NextResponse.json({
      success: true,
      subscription: sub,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customer.id,
    });
  } catch (error: any) {
    console.error("Create subscription error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
