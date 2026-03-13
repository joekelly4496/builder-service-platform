import { db } from "@/lib/db";
import { notificationPreferences, homeownerAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET: Fetch notification preferences
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const [account] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.supabaseUserId, userId))
      .limit(1);

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.homeownerId, account.id))
      .limit(1);

    // Return defaults if no prefs exist yet
    const defaults = {
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      phoneNumber: null,
      maintenanceEmail: true,
      maintenanceSms: false,
      maintenanceInApp: true,
      requestUpdatesEmail: true,
      requestUpdatesSms: false,
      requestUpdatesInApp: true,
      messagesEmail: true,
      messagesSms: false,
      messagesInApp: true,
    };

    return NextResponse.json({
      success: true,
      preferences: prefs ?? defaults,
    });
  } catch (error: any) {
    console.error("Get preferences error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update notification preferences
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, ...prefs } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const [account] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.supabaseUserId, userId))
      .limit(1);

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Check if preferences exist
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.homeownerId, account.id))
      .limit(1);

    const now = new Date();

    if (existing) {
      await db
        .update(notificationPreferences)
        .set({
          emailEnabled: prefs.emailEnabled,
          smsEnabled: prefs.smsEnabled,
          inAppEnabled: prefs.inAppEnabled,
          phoneNumber: prefs.phoneNumber,
          maintenanceEmail: prefs.maintenanceEmail,
          maintenanceSms: prefs.maintenanceSms,
          maintenanceInApp: prefs.maintenanceInApp,
          requestUpdatesEmail: prefs.requestUpdatesEmail,
          requestUpdatesSms: prefs.requestUpdatesSms,
          requestUpdatesInApp: prefs.requestUpdatesInApp,
          messagesEmail: prefs.messagesEmail,
          messagesSms: prefs.messagesSms,
          messagesInApp: prefs.messagesInApp,
          updatedAt: now,
        })
        .where(eq(notificationPreferences.homeownerId, account.id));
    } else {
      await db.insert(notificationPreferences).values({
        homeownerId: account.id,
        emailEnabled: prefs.emailEnabled ?? true,
        smsEnabled: prefs.smsEnabled ?? false,
        inAppEnabled: prefs.inAppEnabled ?? true,
        phoneNumber: prefs.phoneNumber ?? null,
        maintenanceEmail: prefs.maintenanceEmail ?? true,
        maintenanceSms: prefs.maintenanceSms ?? false,
        maintenanceInApp: prefs.maintenanceInApp ?? true,
        requestUpdatesEmail: prefs.requestUpdatesEmail ?? true,
        requestUpdatesSms: prefs.requestUpdatesSms ?? false,
        requestUpdatesInApp: prefs.requestUpdatesInApp ?? true,
        messagesEmail: prefs.messagesEmail ?? true,
        messagesSms: prefs.messagesSms ?? false,
        messagesInApp: prefs.messagesInApp ?? true,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update preferences error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
