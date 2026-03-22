import { db } from "@/lib/db";
import { subcontractors, subSmsMessages, subSmsOptOuts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface TwilioMessageResponse {
  sid: string;
  status: string;
  error_code?: number;
  error_message?: string;
}

interface SubSendSMSParams {
  subcontractorId: string;
  serviceRequestId?: string;
  toNumber: string;
  message: string;
}

/**
 * Send an SMS from a subcontractor's dedicated Twilio business number.
 */
export async function subSendSMS(params: SubSendSMSParams): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> {
  const { subcontractorId, serviceRequestId, toNumber, message } = params;

  try {
    // Get sub's Twilio phone number
    const [sub] = await db
      .select({
        smsEnabled: subcontractors.smsEnabled,
        twilioPhoneNumber: subcontractors.twilioPhoneNumber,
        isSubPro: subcontractors.isSubPro,
        stripeSmsSubscriptionItemId: subcontractors.stripeSmsSubscriptionItemId,
      })
      .from(subcontractors)
      .where(eq(subcontractors.id, subcontractorId))
      .limit(1);

    if (!sub || !sub.smsEnabled || !sub.twilioPhoneNumber || !sub.isSubPro) {
      return { success: false, error: "SMS not enabled. Sub Pro subscription required." };
    }

    // Check TCPA opt-out
    const [optOut] = await db
      .select({ id: subSmsOptOuts.id })
      .from(subSmsOptOuts)
      .where(
        and(
          eq(subSmsOptOuts.subcontractorId, subcontractorId),
          eq(subSmsOptOuts.phoneNumber, toNumber)
        )
      )
      .limit(1);

    if (optOut) {
      return { success: false, error: "Recipient has opted out of SMS" };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return { success: false, error: "Twilio credentials not configured" };
    }

    // Send via Twilio REST API
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const body = new URLSearchParams({
      To: toNumber,
      From: sub.twilioPhoneNumber,
      Body: message,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const result: TwilioMessageResponse = await response.json();

    if (!response.ok) {
      console.error("Twilio sub send error:", result);
      await db.insert(subSmsMessages).values({
        subcontractorId,
        serviceRequestId: serviceRequestId ?? null,
        direction: "outbound",
        fromNumber: sub.twilioPhoneNumber,
        toNumber,
        body: message,
        twilioMessageSid: null,
        costCents: 0,
        status: "failed",
      });
      return { success: false, error: result.error_message || "Failed to send SMS" };
    }

    // Log successful message — $0.03/message for subs
    const [logEntry] = await db.insert(subSmsMessages).values({
      subcontractorId,
      serviceRequestId: serviceRequestId ?? null,
      direction: "outbound",
      fromNumber: sub.twilioPhoneNumber,
      toNumber,
      body: message,
      twilioMessageSid: result.sid,
      costCents: 3,
      status: "sent",
      stripeUsageReported: false,
    }).returning();

    // Report metered usage to Stripe
    if (sub.stripeSmsSubscriptionItemId) {
      try {
        await reportSubSMSUsageToStripe(sub.stripeSmsSubscriptionItemId, logEntry.id);
      } catch (err) {
        console.error("Failed to report sub SMS usage to Stripe:", err);
      }
    }

    console.log(`Sub SMS sent to ${toNumber} from sub ${subcontractorId}, SID: ${result.sid}`);
    return { success: true, messageSid: result.sid };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Sub SMS send error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Provision a Twilio phone number for a subcontractor.
 * Sets up the webhook URL for inbound messages.
 */
export async function provisionSubTwilioNumber(
  subcontractorId: string,
  webhookBaseUrl: string
): Promise<{ success: boolean; phoneNumber?: string; sid?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    // Search for available local phone numbers
    const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?SmsEnabled=true&Limit=1`;

    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Basic ${authHeader}` },
    });

    const searchResult = await searchResponse.json();

    if (!searchResult.available_phone_numbers?.length) {
      return { success: false, error: "No phone numbers available" };
    }

    const availableNumber = searchResult.available_phone_numbers[0];

    // Purchase with inbound SMS webhook
    const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
    const purchaseBody = new URLSearchParams({
      PhoneNumber: availableNumber.phone_number,
      SmsUrl: `${webhookBaseUrl}/api/webhooks/twilio/inbound`,
      SmsMethod: "POST",
    });

    const purchaseResponse = await fetch(purchaseUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: purchaseBody.toString(),
    });

    const purchaseResult = await purchaseResponse.json();

    if (!purchaseResponse.ok) {
      return { success: false, error: purchaseResult.message || "Failed to provision number" };
    }

    // Update sub record
    await db
      .update(subcontractors)
      .set({
        smsEnabled: true,
        twilioPhoneNumber: purchaseResult.phone_number,
        twilioPhoneNumberSid: purchaseResult.sid,
        updatedAt: new Date(),
      })
      .where(eq(subcontractors.id, subcontractorId));

    console.log(`Provisioned Twilio number ${purchaseResult.phone_number} for sub ${subcontractorId}`);
    return { success: true, phoneNumber: purchaseResult.phone_number, sid: purchaseResult.sid };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Provision sub Twilio number error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Report 1 SMS message to Stripe metered billing for a sub.
 */
async function reportSubSMSUsageToStripe(subscriptionItemId: string, smsMessageId: string): Promise<void> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return;

  const authHeader = `Basic ${Buffer.from(`${stripeKey}:`).toString("base64")}`;

  const usageBody = new URLSearchParams({
    quantity: "1",
    action: "increment",
    timestamp: String(Math.floor(Date.now() / 1000)),
  });

  await fetch(
    `https://api.stripe.com/v1/subscription_items/${subscriptionItemId}/usage_records`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: usageBody.toString(),
    }
  );

  await db
    .update(subSmsMessages)
    .set({ stripeUsageReported: true })
    .where(eq(subSmsMessages.id, smsMessageId));

  console.log(`Stripe metered usage reported for sub SMS ${smsMessageId}`);
}
