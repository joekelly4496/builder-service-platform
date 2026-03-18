import { db } from "@/lib/db";
import { homeTradeAssignments, homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    const { id } = await params;
    const body = await request.json();
    const { assignments } = body;

    // Look up home to get builderId
    const [home] = await db.select().from(homes).where(eq(homes.id, id)).limit(1);
    if (!home) {
      return NextResponse.json({ success: false, error: "Home not found" }, { status: 404 });
    }

    // Delete existing assignments for this home
    await db
      .delete(homeTradeAssignments)
      .where(eq(homeTradeAssignments.homeId, id));

    // Insert new assignments
    const newAssignments = Object.entries(assignments).map(([trade, subId]) => ({
      builderId: home.builderId,
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
