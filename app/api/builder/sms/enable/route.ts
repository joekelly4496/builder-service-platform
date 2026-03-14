import { db } from "@/lib/db";
import { builders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { provisionTwilioNumber } from "@/lib/sms/send";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { builderId } = body;

    if (!builderId) {
      return NextResponse.json({ success: false, error: "builderId is required" }, { status: 400 });
    }

    // Check if builder exists
    const [builder] = await db
      .select()
      .from(builders)
      .where(eq(builders.id, builderId))
      .limit(1);

    if (!builder) {
      return NextResponse.json({ success: false, error: "Builder not found" }, { status: 404 });
    }

    // If already enabled, return existing number
    if (builder.smsEnabled && builder.twilioPhoneNumber) {
      return NextResponse.json({
        success: true,
        alreadyEnabled: true,
        phoneNumber: builder.twilioPhoneNumber,
      });
    }

    // Provision a new Twilio number
    const result = await provisionTwilioNumber(builderId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      phoneNumber: result.phoneNumber,
      message: "SMS enabled successfully. A dedicated phone number has been provisioned.",
    });
  } catch (error: any) {
    console.error("Enable SMS error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Disable SMS for a builder
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const builderId = searchParams.get("builderId");

    if (!builderId) {
      return NextResponse.json({ success: false, error: "builderId is required" }, { status: 400 });
    }

    await db
      .update(builders)
      .set({
        smsEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(builders.id, builderId));

    return NextResponse.json({ success: true, message: "SMS disabled. Phone number retained for reactivation." });
  } catch (error: any) {
    console.error("Disable SMS error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
