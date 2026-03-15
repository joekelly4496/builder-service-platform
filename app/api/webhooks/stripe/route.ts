import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homeownerSubscriptions, invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Stripe webhook handler.
 * Processes subscription and invoice events for automated billing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify webhook signature
    if (webhookSecret && signature) {
      const elements = signature.split(",");
      const timestampEl = elements.find(e => e.startsWith("t="));
      const sigEl = elements.find(e => e.startsWith("v1="));

      if (timestampEl && sigEl) {
        const timestamp = timestampEl.split("=")[1];
        const expectedSig = sigEl.split("=")[1];
        const payload = `${timestamp}.${body}`;
        const computedSig = crypto
          .createHmac("sha256", webhookSecret)
          .update(payload)
          .digest("hex");

        if (computedSig !== expectedSig) {
          console.error("Webhook signature verification failed");
          return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }
      }
    }

    const event = JSON.parse(body);
    console.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await db
          .update(homeownerSubscriptions)
          .set({
            status: mapStripeStatus(subscription.status),
            updatedAt: new Date(),
          })
          .where(eq(homeownerSubscriptions.stripeSubscriptionId, subscription.id));
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await db
          .update(homeownerSubscriptions)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(homeownerSubscriptions.stripeSubscriptionId, subscription.id));
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;

        // Update our invoice record if it exists
        if (invoice.id) {
          await db
            .update(invoices)
            .set({
              status: "paid",
              paidAt: new Date(),
              stripePaymentIntentId: invoice.payment_intent,
              updatedAt: new Date(),
            })
            .where(eq(invoices.stripeInvoiceId, invoice.id));
        }

        // If it's a subscription invoice, update the subscription status
        if (invoice.subscription) {
          await db
            .update(homeownerSubscriptions)
            .set({
              status: "active",
              updatedAt: new Date(),
            })
            .where(eq(homeownerSubscriptions.stripeSubscriptionId, invoice.subscription));
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;

        if (invoice.id) {
          await db
            .update(invoices)
            .set({
              status: "overdue",
              updatedAt: new Date(),
            })
            .where(eq(invoices.stripeInvoiceId, invoice.id));
        }

        if (invoice.subscription) {
          await db
            .update(homeownerSubscriptions)
            .set({
              status: "past_due",
              updatedAt: new Date(),
            })
            .where(eq(homeownerSubscriptions.stripeSubscriptionId, invoice.subscription));
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function mapStripeStatus(stripeStatus: string): "active" | "past_due" | "cancelled" | "pending" | "paused" {
  switch (stripeStatus) {
    case "active": return "active";
    case "past_due": return "past_due";
    case "canceled": return "cancelled";
    case "unpaid": return "past_due";
    case "incomplete": return "pending";
    case "paused": return "paused";
    default: return "pending";
  }
}
