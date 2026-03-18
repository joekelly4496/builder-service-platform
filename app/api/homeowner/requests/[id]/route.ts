import { db } from "@/lib/db";
import { serviceRequests, homes, subcontractors, serviceRequestRatings, scheduleApprovals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedHomeowner } from "@/lib/utils/homeowner-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const homeowner = await getAuthenticatedHomeowner();
    if (!homeowner) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

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

    // Verify this request belongs to the homeowner's home
    if (row.request.homeId !== homeowner.home.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const [home] = await db
      .select()
      .from(homes)
      .where(eq(homes.id, row.request.homeId))
      .limit(1);

    const [scheduleApproval] = await db
      .select()
      .from(scheduleApprovals)
      .where(eq(scheduleApprovals.serviceRequestId, id))
      .limit(1);

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
        acknowledgedAt: row.request.acknowledgedAt,
        createdAt: row.request.createdAt,
        slaAcknowledgeDeadline: row.request.slaAcknowledgeDeadline,
        photos: row.request.photos,
        photoUrls: row.request.photoUrls,
        completionPhotos: row.request.completionPhotos,
        subcontractor: row.subcontractor ? {
          companyName: row.subcontractor.companyName,
          contactName: row.subcontractor.contactName,
          email: row.subcontractor.email,
          phone: row.subcontractor.phone,
        } : null,
        home: home ? {
          address: home.address,
          city: home.city,
          state: home.state,
          homeownerName: home.homeownerName,
          homeownerEmail: home.homeownerEmail,
        } : null,
      },
      scheduleApproval: scheduleApproval ?? null,
      rating: rating ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}