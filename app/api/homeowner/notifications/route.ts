import { db } from "@/lib/db";
import { notifications, homeownerAccounts } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET: Fetch notifications for the homeowner
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

    // Find homeowner account
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
    const body = await request.json();
    const { userId, notificationIds } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    // Find homeowner account
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
