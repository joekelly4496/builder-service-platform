import { db } from "@/lib/db";
import { builders, subcontractors, homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { generateCalendarToken } from "@/lib/utils/calendar";

export async function POST(request: Request) {
  try {
    const { entityType, entityId } = await request.json();

    const token = generateCalendarToken();

    if (entityType === "builder") {
      await db.update(builders).set({ calendarToken: token }).where(eq(builders.id, entityId));
    } else if (entityType === "subcontractor") {
      await db.update(subcontractors).set({ calendarToken: token }).where(eq(subcontractors.id, entityId));
    } else if (entityType === "home") {
      await db.update(homes).set({ calendarToken: token }).where(eq(homes.id, entityId));
    } else {
      return NextResponse.json({ success: false, error: "Invalid entity type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
