import { db } from "@/lib/db";
import { subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedSubcontractor } from "@/lib/utils/sub-auth";
import { provisionSubTwilioNumber } from "@/lib/sms/sub-send";

const SUB_PRO_MONTHLY_CENTS = 2900; // $29/month

// GET /api/sub/subscription — check subscription status
export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedSubcontractor(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const sub = authResult.subcontractor;
    return NextResponse.json({
      success: true,
      subscription: {
        isSubPro: sub.isSubPro,
        smsEnabled: sub.smsEnabled,
        twilioPhoneNumber: sub.twilioPhoneNumber,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        priceCents: SUB_PRO_MONTHLY_CENTS,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/sub/subscription — activate Sub Pro ($29/month)
export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedSubcontractor(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const sub = authResult.subcontractor;

    if (sub.isSubPro) {
      return NextResponse.json({ success: false, error: "Already subscribed to Sub Pro" }, { status: 409 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ success: false, error: "Stripe not configured" }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(`${stripeKey}:`).toString("base64")}`;

    // Create or reuse Stripe customer
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customerBody = new URLSearchParams({
        email: sub.email,
        name: sub.companyName,
        "metadata[subcontractor_id]": sub.id,
      });

      const custRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: customerBody.toString(),
      });
      const custData = await custRes.json();
      if (!custRes.ok) {
        return NextResponse.json({ success: false, error: "Failed to create Stripe customer" }, { status: 500 });
      }
      customerId = custData.id;
    }

    // Create a price for Sub Pro if needed (use lookup_key)
    // First check if price exists
    const priceSearchRes = await fetch(
      `https://api.stripe.com/v1/prices?lookup_keys[]=sub_pro_monthly`,
      { headers: { Authorization: authHeader } }
    );
    const priceSearchData = await priceSearchRes.json();

    let priceId: string;
    if (priceSearchData.data?.length > 0) {
      priceId = priceSearchData.data[0].id;
    } else {
      // Create the product and price
      const productBody = new URLSearchParams({
        name: "Sub Pro",
        "metadata[type]": "sub_pro",
      });
      const prodRes = await fetch("https://api.stripe.com/v1/products", {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
        body: productBody.toString(),
      });
      const prodData = await prodRes.json();

      const priceBody = new URLSearchParams({
        product: prodData.id,
        unit_amount: String(SUB_PRO_MONTHLY_CENTS),
        currency: "usd",
        "recurring[interval]": "month",
        lookup_key: "sub_pro_monthly",
      });
      const priceRes = await fetch("https://api.stripe.com/v1/prices", {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
        body: priceBody.toString(),
      });
      const priceData = await priceRes.json();
      priceId = priceData.id;
    }

    // Create metered price for per-message SMS ($0.03/message)
    let meteredPriceId: string;
    const meteredSearchRes = await fetch(
      `https://api.stripe.com/v1/prices?lookup_keys[]=sub_sms_per_message`,
      { headers: { Authorization: authHeader } }
    );
    const meteredSearchData = await meteredSearchRes.json();

    if (meteredSearchData.data?.length > 0) {
      meteredPriceId = meteredSearchData.data[0].id;
    } else {
      const meteredPriceBody = new URLSearchParams({
        product: "sub_sms_messages",
        unit_amount: "3", // $0.03
        currency: "usd",
        "recurring[interval]": "month",
        "recurring[usage_type]": "metered",
        lookup_key: "sub_sms_per_message",
      });

      // Create product first
      const smsProdBody = new URLSearchParams({
        name: "Sub SMS Messages",
        id: "sub_sms_messages",
      });
      await fetch("https://api.stripe.com/v1/products", {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
        body: smsProdBody.toString(),
      }).catch(() => {}); // ignore if exists

      const meteredRes = await fetch("https://api.stripe.com/v1/prices", {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
        body: meteredPriceBody.toString(),
      });
      const meteredData = await meteredRes.json();
      meteredPriceId = meteredData.id;
    }

    // Create subscription with both items
    const subBody = new URLSearchParams({
      customer: customerId!,
      "items[0][price]": priceId,
      "items[1][price]": meteredPriceId,
      "metadata[subcontractor_id]": sub.id,
    });

    const subRes = await fetch("https://api.stripe.com/v1/subscriptions", {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
      body: subBody.toString(),
    });
    const subData = await subRes.json();

    if (!subRes.ok) {
      return NextResponse.json({ success: false, error: subData.error?.message || "Failed to create subscription" }, { status: 500 });
    }

    // Find the metered subscription item ID
    const meteredItem = subData.items?.data?.find(
      (item: { price?: { recurring?: { usage_type?: string } } }) =>
        item.price?.recurring?.usage_type === "metered"
    );

    // Update sub record
    await db
      .update(subcontractors)
      .set({
        isSubPro: true,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subData.id,
        stripeSmsSubscriptionItemId: meteredItem?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(subcontractors.id, sub.id));

    // Auto-provision Twilio number
    const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://builder-service-platform-gm84uvd3e.vercel.app";

    const provisionResult = await provisionSubTwilioNumber(sub.id, webhookBaseUrl);

    return NextResponse.json({
      success: true,
      subscription: {
        stripeSubscriptionId: subData.id,
        isSubPro: true,
      },
      sms: provisionResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/sub/subscription — cancel Sub Pro
export async function DELETE(request: Request) {
  try {
    const authResult = await getAuthenticatedSubcontractor(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const sub = authResult.subcontractor;
    if (!sub.isSubPro || !sub.stripeSubscriptionId) {
      return NextResponse.json({ success: false, error: "No active subscription" }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ success: false, error: "Stripe not configured" }, { status: 500 });
    }

    // Cancel at period end
    const authHeader = `Basic ${Buffer.from(`${stripeKey}:`).toString("base64")}`;
    await fetch(`https://api.stripe.com/v1/subscriptions/${sub.stripeSubscriptionId}`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
      body: "cancel_at_period_end=true",
    });

    await db
      .update(subcontractors)
      .set({
        isSubPro: false,
        smsEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(subcontractors.id, sub.id));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
