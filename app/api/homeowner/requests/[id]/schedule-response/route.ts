import { db } from "@/lib/db";
import { scheduleApprovals, serviceRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedHomeowner } from "@/lib/utils/homeowner-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const homeowner = await getAuthenticatedHomeowner();
    if (!homeowner) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { response } = body;

    if (!["approved", "rejected"].includes(response)) {
      return NextResponse.json(
        { success: false, error: "Invalid response" },
        { status: 400 }
      );
    }

    // Look up service request to get builderId
    const [serviceRequest] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id))
      .limit(1);

    if (!serviceRequest) {
      return NextResponse.json(
        { success: false, error: "Service request not found" },
        { status: 404 }
      );
    }

    // Verify the request belongs to the homeowner's home
    if (serviceRequest.homeId !== homeowner.home.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
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
        builderId: serviceRequest.builderId,
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