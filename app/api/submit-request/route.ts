import { db } from "@/lib/db";
import { serviceRequests, homes, homeTradeAssignments, serviceRequestAuditLog } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { homeId, tradeCategory, priority, description, homeownerEmail } = body;

    // Find the home
    const [home] = await db.select().from(homes).where(eq(homes.id, homeId)).limit(1);

    if (!home) {
      return NextResponse.json({ success: false, error: "Home not found" }, { status: 404 });
    }

    // Find the assigned subcontractor for this trade
    const [assignment] = await db
      .select()
      .from(homeTradeAssignments)
      .where(
        and(
          eq(homeTradeAssignments.homeId, homeId),
          eq(homeTradeAssignments.tradeCategory, tradeCategory)
        )
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          error: `No subcontractor assigned for ${tradeCategory} at this home`,
        },
        { status: 400 }
      );
    }

    // Calculate SLA deadlines based on priority
    const now = new Date();
    let acknowledgeMinutes = 2880; // default: normal (48 hours)
    let scheduleMinutes = 7200; // default: normal (5 days)

    if (priority === "urgent") {
      acknowledgeMinutes = 120; // 2 hours
      scheduleMinutes = 240; // 4 hours
    } else if (priority === "low") {
      acknowledgeMinutes = 7200; // 5 days
      scheduleMinutes = 14400; // 10 days
    }

    const slaAcknowledgeDeadline = new Date(now.getTime() + acknowledgeMinutes * 60000);
    const slaScheduleDeadline = new Date(now.getTime() + scheduleMinutes * 60000);

    // Create the service request
    const [serviceRequest] = await db
      .insert(serviceRequests)
      .values({
        homeId,
        assignedSubcontractorId: assignment.subcontractorId,
        tradeCategory,
        priority: priority as "urgent" | "normal" | "low",
        status: "submitted",
        homeownerDescription: description,
        homeownerContactPreference: homeownerEmail,
        slaAcknowledgeDeadline,
        slaScheduleDeadline,
      })
      .returning();

    // Create audit log entry
    await db.insert(serviceRequestAuditLog).values({
      serviceRequestId: serviceRequest.id,
      actorType: "homeowner",
      actorEmail: homeownerEmail,
      action: "created",
      oldStatus: null,
      newStatus: "submitted",
      metadata: {
        description,
        priority,
        tradeCategory,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service request created successfully!",
      data: {
        requestId: serviceRequest.id,
        status: serviceRequest.status,
        slaAcknowledgeDeadline: serviceRequest.slaAcknowledgeDeadline,
      },
    });
  } catch (error: any) {
    console.error("Error creating service request:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
