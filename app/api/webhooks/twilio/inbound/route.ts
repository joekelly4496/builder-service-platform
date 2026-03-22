import { db } from "@/lib/db";
import { subcontractors, subSmsMessages, subSmsOptOuts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Twilio inbound SMS webhook.
 * Receives messages sent to a sub's business number.
 * Handles TCPA STOP/START opt-out keywords.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const from = String(formData.get("From") ?? "");
    const to = String(formData.get("To") ?? "");
    const body = String(formData.get("Body") ?? "");
    const messageSid = String(formData.get("MessageSid") ?? "");

    if (!from || !to || !body) {
      return twimlResponse("");
    }

    // Find which sub owns this Twilio number
    const [sub] = await db
      .select({ id: subcontractors.id, companyName: subcontractors.companyName })
      .from(subcontractors)
      .where(eq(subcontractors.twilioPhoneNumber, to))
      .limit(1);

    if (!sub) {
      console.error(`Inbound SMS to unknown number: ${to}`);
      return twimlResponse("");
    }

    const normalizedBody = body.trim().toUpperCase();

    // TCPA STOP handling
    if (["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(normalizedBody)) {
      // Check if already opted out
      const [existing] = await db
        .select({ id: subSmsOptOuts.id })
        .from(subSmsOptOuts)
        .where(
          and(
            eq(subSmsOptOuts.subcontractorId, sub.id),
            eq(subSmsOptOuts.phoneNumber, from)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(subSmsOptOuts).values({
          subcontractorId: sub.id,
          phoneNumber: from,
        });
      }

      // Log the inbound message
      await db.insert(subSmsMessages).values({
        subcontractorId: sub.id,
        direction: "inbound",
        fromNumber: from,
        toNumber: to,
        body,
        twilioMessageSid: messageSid,
        status: "received",
      });

      return twimlResponse(
        `You have been unsubscribed from ${sub.companyName} messages. Reply START to resubscribe.`
      );
    }

    // TCPA START handling (re-subscribe)
    if (["START", "SUBSCRIBE", "YES"].includes(normalizedBody)) {
      await db
        .delete(subSmsOptOuts)
        .where(
          and(
            eq(subSmsOptOuts.subcontractorId, sub.id),
            eq(subSmsOptOuts.phoneNumber, from)
          )
        );

      await db.insert(subSmsMessages).values({
        subcontractorId: sub.id,
        direction: "inbound",
        fromNumber: from,
        toNumber: to,
        body,
        twilioMessageSid: messageSid,
        status: "received",
      });

      return twimlResponse(
        `You have been resubscribed to ${sub.companyName} messages. Reply STOP to unsubscribe.`
      );
    }

    // HELP keyword
    if (normalizedBody === "HELP") {
      await db.insert(subSmsMessages).values({
        subcontractorId: sub.id,
        direction: "inbound",
        fromNumber: from,
        toNumber: to,
        body,
        twilioMessageSid: messageSid,
        status: "received",
      });

      return twimlResponse(
        `${sub.companyName} via Homefront. Reply STOP to unsubscribe. For support visit homefront.com.`
      );
    }

    // Regular inbound message — log it
    await db.insert(subSmsMessages).values({
      subcontractorId: sub.id,
      direction: "inbound",
      fromNumber: from,
      toNumber: to,
      body,
      twilioMessageSid: messageSid,
      status: "received",
    });

    // No auto-reply for regular messages
    return twimlResponse("");
  } catch (error) {
    console.error("Twilio inbound webhook error:", error);
    return twimlResponse("");
  }
}

function twimlResponse(message: string): NextResponse {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
