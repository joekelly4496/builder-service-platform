import { db } from "@/lib/db";
import { smsLogs, builders, homes, homeownerAccounts, homeownerSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface TwilioMessageResponse {
  sid: string;
  status: string;
  error_code?: number;
  error_message?: string;
}

interface SendSMSParams {
  builderId: string;
  homeId?: string;
  toNumber: string;
  message: string;
}

/**
 * Send an SMS via the builder's dedicated Twilio number.
 * Uses the Twilio REST API directly (no SDK needed).
 */
export async function sendSMS(params: SendSMSParams): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const { builderId, homeId, toNumber, message } = params;

  try {
    // Get builder's Twilio phone number
    const [builder] = await db
      .select({
        smsEnabled: builders.smsEnabled,
        twilioPhoneNumber: builders.twilioPhoneNumber,
      })
      .from(builders)
      .where(eq(builders.id, builderId))
      .limit(1);

    if (!builder || !builder.smsEnabled || !builder.twilioPhoneNumber) {
      return { success: false, error: "SMS not enabled for this builder" };
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
      From: builder.twilioPhoneNumber,
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
      console.error("Twilio send error:", result);
      // Log the failed attempt
      await db.insert(smsLogs).values({
        builderId,
        homeId: homeId ?? null,
        toNumber,
        message,
        twilioMessageSid: null,
        costCents: 0,
        status: "failed",
      });
      return { success: false, error: result.error_message || "Failed to send SMS" };
    }

    // Log successful message — wholesale cost to builder is $0.02/message
    const [logEntry] = await db.insert(smsLogs).values({
      builderId,
      homeId: homeId ?? null,
      toNumber,
      message,
      twilioMessageSid: result.sid,
      costCents: 2,
      status: "sent",
      stripeUsageReported: false,
    }).returning();

    // Report metered usage to Stripe immediately for per-message billing
    if (homeId) {
      try {
        await reportSMSUsageToStripe(builderId, homeId, logEntry.id);
      } catch (usageErr) {
        console.error("Failed to report SMS usage to Stripe:", usageErr);
      }
    }

    console.log(`SMS sent to ${toNumber} via builder ${builderId}, SID: ${result.sid}`);
    return { success: true, messageSid: result.sid };
  } catch (error: any) {
    console.error("SMS send error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS to a homeowner if they have opted in and their builder has SMS enabled.
 * Looks up phone number and opt-in status from homeownerAccounts.
 */
export async function sendSMSToHomeowner(params: {
  builderId: string;
  homeId: string;
  message: string;
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const { builderId, homeId, message } = params;

  try {
    // Check if builder has SMS enabled
    const [builder] = await db
      .select({ smsEnabled: builders.smsEnabled, twilioPhoneNumber: builders.twilioPhoneNumber })
      .from(builders)
      .where(eq(builders.id, builderId))
      .limit(1);

    if (!builder?.smsEnabled || !builder.twilioPhoneNumber) {
      return { success: true, skipped: true };
    }

    // Check if homeowner has opted in with a phone number
    const [account] = await db
      .select({ phoneNumber: homeownerAccounts.phoneNumber, smsOptIn: homeownerAccounts.smsOptIn })
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.homeId, homeId))
      .limit(1);

    if (!account?.smsOptIn || !account.phoneNumber) {
      return { success: true, skipped: true };
    }

    return await sendSMS({
      builderId,
      homeId,
      toNumber: account.phoneNumber,
      message,
    });
  } catch (error: any) {
    console.error("SMS to homeowner error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Provision a Twilio phone number for a builder.
 * Searches for available local numbers and purchases one.
 */
export async function provisionTwilioNumber(builderId: string): Promise<{ success: boolean; phoneNumber?: string; sid?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  try {
    // Search for available local phone numbers in the US
    const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/US/Local.json?SmsEnabled=true&Limit=1`;

    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Basic ${authHeader}` },
    });

    const searchResult = await searchResponse.json();

    if (!searchResult.available_phone_numbers || searchResult.available_phone_numbers.length === 0) {
      return { success: false, error: "No phone numbers available" };
    }

    const availableNumber = searchResult.available_phone_numbers[0];

    // Purchase the phone number
    const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
    const purchaseBody = new URLSearchParams({
      PhoneNumber: availableNumber.phone_number,
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

    // Update builder record with the new number
    await db
      .update(builders)
      .set({
        smsEnabled: true,
        twilioPhoneNumber: purchaseResult.phone_number,
        twilioPhoneNumberSid: purchaseResult.sid,
        updatedAt: new Date(),
      })
      .where(eq(builders.id, builderId));

    console.log(`Provisioned Twilio number ${purchaseResult.phone_number} for builder ${builderId}`);
    return { success: true, phoneNumber: purchaseResult.phone_number, sid: purchaseResult.sid };
  } catch (error: any) {
    console.error("Provision Twilio number error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Report a single SMS message as metered usage to Stripe.
 * Finds the homeowner's subscription and reports 1 unit to the metered price item.
 */
async function reportSMSUsageToStripe(builderId: string, homeId: string, smsLogId: string): Promise<void> {
  // Find the homeowner's subscription with SMS metered billing
  const [sub] = await db
    .select()
    .from(homeownerSubscriptions)
    .where(
      and(
        eq(homeownerSubscriptions.homeId, homeId),
        eq(homeownerSubscriptions.builderId, builderId),
        eq(homeownerSubscriptions.status, "active"),
        eq(homeownerSubscriptions.smsAddonEnabled, true)
      )
    )
    .limit(1);

  if (!sub?.stripeSubscriptionId) return;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return;

  const authHeader = `Basic ${Buffer.from(`${stripeKey}:`).toString("base64")}`;

  // Fetch subscription items from Stripe to find the metered one
  const res = await fetch(
    `https://api.stripe.com/v1/subscription_items?subscription=${sub.stripeSubscriptionId}`,
    { headers: { Authorization: authHeader } }
  );
  const items = await res.json();

  const meteredItem = items.data?.find((item: any) =>
    item.price?.recurring?.usage_type === "metered"
  );

  if (!meteredItem) return;

  // Report 1 message usage
  const usageBody = new URLSearchParams({
    quantity: "1",
    action: "increment",
    timestamp: String(Math.floor(Date.now() / 1000)),
  });

  await fetch(
    `https://api.stripe.com/v1/subscription_items/${meteredItem.id}/usage_records`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: usageBody.toString(),
    }
  );

  // Mark usage as reported
  await db
    .update(smsLogs)
    .set({ stripeUsageReported: true })
    .where(eq(smsLogs.id, smsLogId));

  console.log(`Stripe metered usage reported for SMS log ${smsLogId}`);
}
