import { db } from "@/lib/db";
import { homes } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, city, state, zipCode, homeownerName, homeownerEmail, homeownerPhone } = body;

    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const builderId = builder.id;

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
