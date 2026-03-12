import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceItems, maintenanceReminders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/maintenance-items?homeId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const homeId = searchParams.get("homeId");
    if (!homeId) {
      return NextResponse.json(
        { error: "homeId query parameter is required" },
        { status: 400 }
      );
    }
    const items = await db
      .select()
      .from(maintenanceItems)
      .where(eq(maintenanceItems.homeId, homeId));
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
    console.error("Error fetching maintenance items:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance items" },
      { status: 500 }
    );
  }
}

// POST /api/maintenance-items
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      homeId,
      name,
      description,
      tradeCategory,
      installedAt,
      installNotes,
      reminder,
    } = body;
    if (!homeId || !name || !tradeCategory) {
      return NextResponse.json(
        { error: "homeId, name, and tradeCategory are required" },
        { status: 400 }
      );
    }
    if (!reminder || !reminder.title || !reminder.intervalDays) {
      return NextResponse.json(
        { error: "reminder.title and reminder.intervalDays are required" },
        { status: 400 }
      );
    }
    const [newItem] = await db
      .insert(maintenanceItems)
      .values({
        homeId,
        name,
        description: description || null,
        tradeCategory,
        installedAt: installedAt ? new Date(installedAt) : null,
        installNotes: installNotes || null,
      })
      .returning();
    let nextDueDate: Date;
    if (reminder.nextDueDate) {
      nextDueDate = new Date(reminder.nextDueDate);
    } else if (installedAt) {
      nextDueDate = new Date(installedAt);
      nextDueDate.setDate(nextDueDate.getDate() + Number(reminder.intervalDays));
    } else {
      nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + Number(reminder.intervalDays));
    }
        const [newReminder] = await db
      .insert(maintenanceReminders)
      .values({
        maintenanceItemId: newItem.id,
        homeId,
        title: reminder.title,

        description: reminder.description || null,
        intervalDays: Number(reminder.intervalDays),
        nextDueDate,
        isActive: true,
      })
      .returning();
    return NextResponse.json(
      { item: newItem, reminder: newReminder },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating maintenance item:", error);
    return NextResponse.json(
      { error: "Failed to create maintenance item" },
      { status: 500 }
    );
  }
}
