import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests, serviceRequestAuditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    // Load current request
    const existing = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id))
      .limit(1);

    const current = existing[0];
    if (!current) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    if (current.builderId !== builder.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const oldStatus = current.status;

    // Update request
    await db
      .update(serviceRequests)
      .set({
        status: "acknowledged",
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, id));

    // Write audit log (non-blocking if it fails)
    try {
      await db.insert(serviceRequestAuditLog).values({
        builderId: current.builderId,
        serviceRequestId: id,
        actorType: "builder",
        actorEmail: "builder@demo.com",
        action: "acknowledged",
        oldStatus,
        newStatus: "acknowledged",
        metadata: { source: "builder_dashboard" },
        timestamp: new Date(),
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

