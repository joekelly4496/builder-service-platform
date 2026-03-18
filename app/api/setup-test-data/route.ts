import { db } from "@/lib/db";
import { builders, homes, subcontractors, homeTradeAssignments, builderSubcontractorRelationships } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Create a test builder
    const [builder] = await db
      .insert(builders)
      .values({
        companyName: "Demo Construction Co",
        contactName: "John Builder",
        email: "builder@demo.com",
        phone: "555-0100",
      })
      .returning();

    // Create a test home
    const [home] = await db
      .insert(homes)
      .values({
        builderId: builder.id,
        address: "123 Demo Street",
        city: "Demo City",
        state: "CA",
        zipCode: "90210",
        homeownerName: "Jane Homeowner",
        homeownerEmail: "homeowner@demo.com",
        homeownerPhone: "555-0200",
      })
      .returning();

    // Create a test subcontractor
    const [sub] = await db
      .insert(subcontractors)
      .values({
        companyName: "Demo Plumbing LLC",
        contactName: "Mike Plumber",
        email: "plumber@demo.com",
        phone: "555-0300",
        tradeCategories: ["plumbing"],
      })
      .returning();

    // Create the builder-subcontractor relationship
    await db.insert(builderSubcontractorRelationships).values({
      builderId: builder.id,
      subcontractorId: sub.id,
    });

    // Assign subcontractor to home for plumbing
    await db.insert(homeTradeAssignments).values({
      builderId: builder.id,
      homeId: home.id,
      subcontractorId: sub.id,
      tradeCategory: "plumbing",
    });

    return NextResponse.json({
      success: true,
      message: "Test data created successfully!",
      data: {
        builderId: builder.id,
        homeId: home.id,
        subcontractorId: sub.id,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
