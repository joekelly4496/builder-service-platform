import { db } from "@/lib/db";
import { scheduleApprovals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { response } = body;

    if (!["approved", "rejected"].includes(response)) {
      return NextResponse.json(
        { success: false, error: "Invalid response" },
        { status: 400 }
      );
    }

    // Check if approval record already exists
    const [existing] = await db
      .select()
      .from(scheduleApprovals)
      .where(eq(scheduleApprovals.serviceRequestId, id))
      .limit(1);

    if (existing) {
      // Update existing record
      await db
        .update(scheduleApprovals)
        .set({
          status: response,
          homeownerResponse: response === "approved" ? "Confirmed" : "Requested different time",
          respondedAt: new Date(),
        })
        .where(eq(scheduleApprovals.serviceRequestId, id));
    } else {
      // Create new record
      await db.insert(scheduleApprovals).values({
        serviceRequestId: id,
        status: response,
        homeownerResponse: response === "approved" ? "Confirmed" : "Requested different time",
        respondedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}