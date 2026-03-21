import { db } from "@/lib/db";
import { subNotifications } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedSubcontractor } from "@/lib/utils/sub-auth";

export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedSubcontractor(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const results = await db
      .select()
      .from(subNotifications)
      .where(eq(subNotifications.subcontractorId, authResult.subcontractor.id))
      .orderBy(desc(subNotifications.createdAt))
      .limit(50);

    const unreadCount = results.filter((n) => !n.isRead).length;

    return NextResponse.json({ success: true, notifications: results, unreadCount });
  } catch (error: any) {
    console.error("Sub notifications fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await getAuthenticatedSubcontractor(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds } = body;

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      await db
        .update(subNotifications)
        .set({ isRead: true })
        .where(
          and(
            eq(subNotifications.subcontractorId, authResult.subcontractor.id),
            inArray(subNotifications.id, notificationIds)
          )
        );
    } else {
      await db
        .update(subNotifications)
        .set({ isRead: true })
        .where(eq(subNotifications.subcontractorId, authResult.subcontractor.id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Sub mark read error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
