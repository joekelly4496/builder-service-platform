import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceItems, maintenanceReminders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedHomeowner } from "@/lib/utils/homeowner-auth";

// GET /api/homeowner/maintenance — get maintenance items for the homeowner's home
export async function GET() {
  try {
    const result = await getAuthenticatedHomeowner();
    if (!result) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { home } = result;

    const items = await db
      .select()
      .from(maintenanceItems)
      .where(eq(maintenanceItems.homeId, home.id));

    const itemsWithReminders = await Promise.all(
      items.map(async (item) => {
        const reminders = await db
          .select()
          .from(maintenanceReminders)
          .where(eq(maintenanceReminders.maintenanceItemId, item.id));
        return {
          ...item,
          reminders,
        };
      })
    );

    return NextResponse.json({ items: itemsWithReminders });
  } catch (error) {
    console.error("Error fetching homeowner maintenance items:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance items" },
      { status: 500 }
    );
  }
}
