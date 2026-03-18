import { db } from "@/lib/db";
import { subcontractors, homeTradeAssignments, builderSubcontractorRelationships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

    // Check if sub with this email already exists (global profile)
    let subcontractor;
    const [existing] = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.email, email))
      .limit(1);

    if (existing) {
      subcontractor = existing;
    } else {
      const [newSub] = await db
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
      subcontractor = newSub;
    }

    // Create the builder-subcontractor relationship (if not already linked for THIS builder)
    const [existingRel] = await db
      .select()
      .from(builderSubcontractorRelationships)
      .where(and(
        eq(builderSubcontractorRelationships.builderId, builderId),
        eq(builderSubcontractorRelationships.subcontractorId, subcontractor.id),
      ))
      .limit(1);

    if (!existingRel) {
      await db.insert(builderSubcontractorRelationships).values({
        builderId,
        subcontractorId: subcontractor.id,
      });
    }

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
    return NextResponse.json({ success: false, error: "Failed to create subcontractor. Please try again." }, { status: 500 });
  }
}
