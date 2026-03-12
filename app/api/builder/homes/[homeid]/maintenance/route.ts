import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceItems, maintenanceReminders, homes, builders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { addDays } from "date-fns";

async function verifyBuilderOwnsHome(homeId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const builder = await db.query.builders.findFirst({
    where: eq(builders.email, user.email!),
  });
  if (!builder) return null;

  const home = await db.query.homes.findFirst({
    where: eq(homes.id, homeId),
  });
  if (!home || home.builderId !== builder.id) return null;

  return { builder, home };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ homeId: string }> }
) {
  const { homeId } = await params;
  const auth = await verifyBuilderOwnsHome(homeId);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.query.maintenanceItems.findMany({
    where: eq(maintenanceItems.homeId, homeId),
  });

  const itemsWithReminders = await Promise.all(
    items.map(async (item) => {
      const reminders = await db.query.maintenanceReminders.findMany({
        where: eq(maintenanceReminders.maintenanceItemId, item.id),
      });
      return { ...item, reminders };
    })
  );

  return NextResponse.json({ items: itemsWithReminders });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ homeId: string }> }
) {
  const { homeId } = await params;
  const auth = await verifyBuilderOwnsHome(homeId);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    name,
    description,
    tradeCategory,
    installedAt,
    installNotes,
    reminderTitle,
    reminderDescription,
    intervalDays,
  } = body;

  if (!name || !tradeCategory || !reminderTitle || !intervalDays) {
    return NextResponse.json(
      { error: "Missing required fields: name, tradeCategory, reminderTitle, intervalDays" },
      { status: 400 }
    );
  }

  if (typeof intervalDays !== "number" || intervalDays < 1) {
    return NextResponse.json(
      { error: "intervalDays must be a positive number" },
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

  const baseDate = installedAt ? new Date(installedAt) : new Date();
  const nextDueDate = addDays(baseDate, intervalDays);

  const [newReminder] = await db
    .insert(maintenanceReminders)
    .values({
      maintenanceItemId: newItem.id,
      homeId,
      title: reminderTitle,
      description: reminderDescription || null,
      intervalDays,
      nextDueDate,
      isActive: true,
    })
    .returning();

  return NextResponse.json({ item: newItem, reminder: newReminder }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ homeId: string }> }
) {
  const { homeId } = await params;
  const auth = await verifyBuilderOwnsHome(homeId);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });

  await db
    .update(maintenanceReminders)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(maintenanceReminders.maintenanceItemId, itemId));

  return NextResponse.json({ success: true });
}