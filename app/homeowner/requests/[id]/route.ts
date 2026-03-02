import { db } from "@/lib/db";
import { serviceRequests, homes, subcontractors, serviceRequestRatings, scheduleApprovals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [row] = await db
      .select({
        request: serviceRequests,
        subcontractor: subcontractors,
      })
      .from(serviceRequests)
      .leftJoin(subcontractors, eq(serviceRequests.assignedSubcontractorId, subcontractors.id))
      .where(eq(serviceRequests.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    // Get schedule approval if exists
    const [scheduleApproval] = await db
      .select()
      .from(scheduleApprovals)
      .where(eq(scheduleApprovals.serviceRequestId, id))
      .limit(1);

    // Get rating if exists
    const [rating] = await db
      .select()
      .from(serviceRequestRatings)
      .where(eq(serviceRequestRatings.serviceRequestId, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      request: {
        id: row.request.id,
        tradeCategory: row.request.tradeCategory,
        priority: row.request.priority,
        status: row.request.status,
        homeownerDescription: row.request.homeownerDescription,
        subcontractorNotes: row.request.subcontractorNotes,
        completionNotes: row.request.completionNotes,
        scheduledFor: row.request.scheduledFor,
        completedAt: row.request.completedAt,
        createdAt: row.request.createdAt,
        slaAcknowledgeDeadline: row.request.slaAcknowledgeDeadline,
        photoUrls: row.request.photoUrls,
        subcontractor: row.subcontractor ? {
          companyName: row.subcontractor.companyName,
          contactName: row.subcontractor.contactName,
          phone: row.subcontractor.phone,
        } : null,
      },
      scheduleApproval: scheduleApproval ?? null,
      rating: rating ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}