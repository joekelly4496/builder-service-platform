import { db } from "@/lib/db";
import { subcontractors, homeTradeAssignments, builderSubcontractorRelationships } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, contactName, email, phone, tradeCategories, homeAssignments } = body;

    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const builderId = builder.id;

    // Create the subcontractor
    const [subcontractor] = await db
      .insert(subcontractors)
      .values({
        companyName,
        contactName,
        email,
        phone: phone || null,
        tradeCategories,
        status: "active",
      })
      .returning();

    // Create the builder-subcontractor relationship
    await db.insert(builderSubcontractorRelationships).values({
      builderId,
      subcontractorId: subcontractor.id,
    });

    // Create home assignments if provided
    if (homeAssignments && Object.keys(homeAssignments).length > 0) {
      const assignments = [];
      for (const [homeId, trades] of Object.entries(homeAssignments)) {
        for (const trade of trades as string[]) {
          assignments.push({
            builderId,
            homeId,
            subcontractorId: subcontractor.id,
            tradeCategory: trade,
          });
        }
      }

      if (assignments.length > 0) {
        await db.insert(homeTradeAssignments).values(assignments);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Subcontractor created successfully!",
      data: { subcontractorId: subcontractor.id },
    });
  } catch (error: any) {
    console.error("Error creating subcontractor:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
