import { db } from "@/lib/db";
import { notifications, homeownerAccounts } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedHomeowner } from "@/lib/utils/homeowner-auth";

// GET: Fetch notifications for the homeowner
export async function GET(request: Request) {
  try {
    const result = await getAuthenticatedHomeowner();
    if (!result) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { account } = result;

    // Fetch recent notifications (last 50)
    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.homeownerId, account.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    // Count unread
    const unreadCount = results.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications: results,
      unreadCount,
    });
  } catch (error: any) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Mark notifications as read
export async function PATCH(request: Request) {
  try {
    const result = await getAuthenticatedHomeowner();
    if (!result) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { account } = result;

    const body = await request.json();
    const { notificationIds } = body;

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.homeownerId, account.id),
            inArray(notifications.id, notificationIds)
          )
        );
    } else {
      // Mark all as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.homeownerId, account.id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mark read error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
