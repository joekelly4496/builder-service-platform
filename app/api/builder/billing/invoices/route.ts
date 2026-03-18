import { db } from "@/lib/db";
import { invoices, invoiceLineItems, homes, builders, homeownerAccounts, homeownerSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { stripeRequest } from "@/lib/stripe/client";
import { sendEmail } from "@/lib/emails/send";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

/**
 * GET: List invoices for a builder.
 */
export async function GET(request: NextRequest) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const builderId = builder.id;

    const allInvoices = await db
      .select({
        invoice: invoices,
        home: homes,
      })
      .from(invoices)
      .innerJoin(homes, eq(invoices.homeId, homes.id))
      .where(eq(invoices.builderId, builderId))
      .orderBy(invoices.createdAt);

    return NextResponse.json({ success: true, invoices: allInvoices });
  } catch (error: any) {
    console.error("List invoices error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: Create a one-time invoice for a homeowner.
 */
export async function POST(request: NextRequest) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const builderId = builder.id;

    const body = await request.json();
    const { homeId, description, lineItems, dueDate } = body;

    if (!homeId || !lineItems?.length) {
      return NextResponse.json({ success: false, error: "homeId and lineItems required" }, { status: 400 });
    }

    if (!builder.stripeConnectAccountId) {
      return NextResponse.json({ success: false, error: "Builder must connect Stripe first" }, { status: 400 });
    }

    const [home] = await db.select().from(homes).where(eq(homes.id, homeId)).limit(1);
    if (!home) {
      return NextResponse.json({ success: false, error: "Home not found" }, { status: 404 });
    }

    // Get or create Stripe customer
    const [sub] = await db
      .select()
      .from(homeownerSubscriptions)
      .where(and(eq(homeownerSubscriptions.homeId, homeId), eq(homeownerSubscriptions.builderId, builderId)))
      .limit(1);

    let stripeCustomerId = sub?.stripeCustomerId ?? "";

    if (!stripeCustomerId) {
      const customer = await stripeRequest("/customers", "POST", {
        email: home.homeownerEmail,
        name: home.homeownerName,
        "metadata[homeId]": homeId,
        "metadata[builderId]": builderId,
      });
      stripeCustomerId = customer.id;
    }

    // Calculate totals
    const items = lineItems as { description: string; quantity: number; unitPriceCents: number }[];
    const subtotalCents = items.reduce((sum, item) => sum + (item.quantity * item.unitPriceCents), 0);
    const totalCents = subtotalCents;

    // Create Stripe invoice
    const stripeInvoice = await stripeRequest("/invoices", "POST", {
      customer: stripeCustomerId,
      collection_method: "send_invoice",
      days_until_due: dueDate ? String(Math.max(1, Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000))) : "7",
      "transfer_data[destination]": builder.stripeConnectAccountId,
      "metadata[homeId]": homeId,
      "metadata[builderId]": builderId,
      "metadata[type]": "one_time_invoice",
    });

    // Add line items to Stripe invoice
    for (const item of items) {
      await stripeRequest("/invoiceitems", "POST", {
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        description: item.description,
        quantity: String(item.quantity),
        unit_amount: String(item.unitPriceCents),
        currency: "usd",
      });
    }

    // Finalize and send the Stripe invoice
    const finalizedInvoice = await stripeRequest(`/invoices/${stripeInvoice.id}/finalize`, "POST");

    // Get homeowner account
    const [hoAccount] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.homeId, homeId))
      .limit(1);

    // Store in our DB
    const [invoice] = await db.insert(invoices).values({
      homeId,
      builderId,
      homeownerAccountId: hoAccount?.id ?? null,
      stripeInvoiceId: finalizedInvoice.id,
      status: "sent",
      subtotalCents,
      platformFeeCents: 0,
      totalCents,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      paymentUrl: finalizedInvoice.hosted_invoice_url,
    }).returning();

    // Store line items
    for (const item of items) {
      await db.insert(invoiceLineItems).values({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.quantity * item.unitPriceCents,
      });
    }

    // Send invoice email to homeowner
    await sendEmail({
      to: home.homeownerEmail,
      subject: `Invoice from ${builder.companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Invoice from ${builder.companyName}</h2>
          <p>Hi ${home.homeownerName},</p>
          <p>You have a new invoice for your home at <strong>${home.address}</strong>.</p>
          ${description ? `<p>${description}</p>` : ""}
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="font-size: 24px; font-weight: bold; margin: 0;">$${(totalCents / 100).toFixed(2)}</p>
            ${dueDate ? `<p style="color: #666; margin: 4px 0 0;">Due: ${new Date(dueDate).toLocaleDateString()}</p>` : ""}
          </div>
          <a href="${finalizedInvoice.hosted_invoice_url}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Pay Now
          </a>
        </div>
      `,
      text: `Invoice from ${builder.companyName}: $${(totalCents / 100).toFixed(2)}. Pay at: ${finalizedInvoice.hosted_invoice_url}`,
    });

    return NextResponse.json({
      success: true,
      invoice,
      paymentUrl: finalizedInvoice.hosted_invoice_url,
    });
  } catch (error: any) {
    console.error("Create invoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
