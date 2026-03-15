import { db } from "@/lib/db";
import { homes } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { getBuilderId } from "@/lib/utils/get-builder-id";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, city, state, zipCode, homeownerName, homeownerEmail, homeownerPhone } = body;

    const builderId = await getBuilderId();

    const [home] = await db
      .insert(homes)
      .values({
        builderId,
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
