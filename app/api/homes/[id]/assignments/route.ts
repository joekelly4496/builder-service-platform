import { db } from "@/lib/db";
import { homeTradeAssignments, homes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify this home belongs to the authenticated builder
    const [home] = await db
      .select()
      .from(homes)
      .where(and(eq(homes.id, id), eq(homes.builderId, builder.id)))
      .limit(1);

    if (!home) {
      return NextResponse.json({ success: false, error: "Home not found" }, { status: 404 });
    }

    const assignments = await db
      .select({
        tradeCategory: homeTradeAssignments.tradeCategory,
        subcontractorId: homeTradeAssignments.subcontractorId,
      })
      .from(homeTradeAssignments)
      .where(eq(homeTradeAssignments.homeId, id));

    return NextResponse.json({ success: true, data: assignments });
  } catch (error: any) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { assignments } = body;

    // Verify this home belongs to the authenticated builder
    const [home] = await db
      .select()
      .from(homes)
      .where(and(eq(homes.id, id), eq(homes.builderId, builder.id)))
      .limit(1);

    if (!home) {
      return NextResponse.json({ success: false, error: "Home not found" }, { status: 404 });
    }

    // Delete existing assignments for this home
    await db
      .delete(homeTradeAssignments)
      .where(eq(homeTradeAssignments.homeId, id));

    // Insert new assignments
    const newAssignments = Object.entries(assignments).map(([trade, subId]) => ({
      builderId: builder.id,
      homeId: id,
      subcontractorId: subId as string,
      tradeCategory: trade,
    }));

    if (newAssignments.length > 0) {
      await db.insert(homeTradeAssignments).values(newAssignments);
    }

    return NextResponse.json({ success: true, message: "Assignments updated successfully" });
  } catch (error: any) {
    console.error("Error updating assignments:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
