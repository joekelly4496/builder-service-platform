import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceItems, maintenanceReminders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

// PUT /api/maintenance-items/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const { name, description, tradeCategory, installedAt, installNotes, reminder } =
      body;
    const itemUpdate: Record<string, unknown> = {};
    if (name !== undefined) itemUpdate.name = name;
    if (description !== undefined) itemUpdate.description = description;
    if (tradeCategory !== undefined) itemUpdate.tradeCategory = tradeCategory;
    if (installedAt !== undefined)
      itemUpdate.installedAt = installedAt ? new Date(installedAt) : null;
    if (installNotes !== undefined) itemUpdate.installNotes = installNotes;
    let updatedItem = null;
    if (Object.keys(itemUpdate).length > 0) {
      const [result] = await db
        .update(maintenanceItems)
        .set(itemUpdate)
        .where(and(eq(maintenanceItems.id, id), eq(maintenanceItems.builderId, builder.id)))
        .returning();
      if (!result) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      updatedItem = result;
    }
    let updatedReminder = null;
    if (reminder && reminder.id) {
      const reminderUpdate: Record<string, unknown> = {};
      if (reminder.title !== undefined) reminderUpdate.title = reminder.title;
      if (reminder.description !== undefined)
        reminderUpdate.description = reminder.description;
      if (reminder.intervalDays !== undefined)
        reminderUpdate.intervalDays = Number(reminder.intervalDays);
      if (reminder.isActive !== undefined)
        reminderUpdate.isActive = reminder.isActive;
      if (reminder.intervalDays !== undefined && !reminder.nextDueDate) {
        const baseDate = installedAt
          ? new Date(installedAt)
          : updatedItem?.installedAt
          ? new Date(updatedItem.installedAt)
          : new Date();
        const nextDate = new Date(baseDate);
        const interval = Number(reminder.intervalDays);
        const now = new Date();
        while (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + interval);
        }
        reminderUpdate.nextDueDate = nextDate;
      } else if (reminder.nextDueDate) {
        reminderUpdate.nextDueDate = new Date(reminder.nextDueDate);
      }
      reminderUpdate.updatedAt = new Date();
      const [result] = await db
        .update(maintenanceReminders)
        .set(reminderUpdate)
        .where(eq(maintenanceReminders.id, reminder.id))
        .returning();
      updatedReminder = result;
    }
    return NextResponse.json({
      item: updatedItem,
      reminder: updatedReminder,
    });
  } catch (error) {
    console.error("Error updating maintenance item:", error);
    return NextResponse.json(
      { error: "Failed to update maintenance item" },
      { status: 500 }
    );
  }
}

// DELETE /api/maintenance-items/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await db
      .delete(maintenanceReminders)
      .where(eq(maintenanceReminders.maintenanceItemId, id));
    const [deleted] = await db
      .delete(maintenanceItems)
      .where(and(eq(maintenanceItems.id, id), eq(maintenanceItems.builderId, builder.id)))
      .returning();
    if (!deleted) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting maintenance item:", error);
    return NextResponse.json(
      { error: "Failed to delete maintenance item" },
      { status: 500 }
    );
  }
}
