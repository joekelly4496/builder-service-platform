import { db } from "@/lib/db";
import { homes } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, city, state, zipCode, homeownerName, homeownerEmail, homeownerPhone } = body;

    // For now, hardcode the test builder ID
    const TEST_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";

    const [home] = await db
      .insert(homes)
      .values({
        builderId: TEST_BUILDER_ID,
        address,
        city,
        state,
        zipCode,
        homeownerName,
        homeownerEmail,
        homeownerPhone: homeownerPhone || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Home created successfully!",
      data: { homeId: home.id },
    });
  } catch (error: any) {
    console.error("Error creating home:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
