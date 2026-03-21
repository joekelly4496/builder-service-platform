import { db } from "@/lib/db";
import { builderNotifications } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

export async function GET() {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const results = await db
      .select()
      .from(builderNotifications)
      .where(eq(builderNotifications.builderId, builder.id))
      .orderBy(desc(builderNotifications.createdAt))
      .limit(50);

    const unreadCount = results.filter((n) => !n.isRead).length;

    return NextResponse.json({ success: true, notifications: results, unreadCount });
  } catch (error: any) {
    console.error("Builder notifications fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds } = body;

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      await db
        .update(builderNotifications)
        .set({ isRead: true })
        .where(
          and(
            eq(builderNotifications.builderId, builder.id),
            inArray(builderNotifications.id, notificationIds)
          )
        );
    } else {
      await db
        .update(builderNotifications)
        .set({ isRead: true })
        .where(eq(builderNotifications.builderId, builder.id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Builder mark read error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
