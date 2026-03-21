import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests, serviceRequestAuditLog, builders, homes, subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";
import { getAuthenticatedSubcontractor } from "@/lib/utils/sub-auth";
import { sendEmail } from "@/lib/emails/send";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Try builder auth first (cookie-based), then sub auth (bearer token)
    const builder = await getAuthenticatedBuilder();
    const subAuth = !builder ? await getAuthenticatedSubcontractor(req) : null;

    if (!builder && !subAuth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Load current request with home and sub info
    const [requestData] = await db
      .select({
        request: serviceRequests,
        home: homes,
      })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .where(eq(serviceRequests.id, id))
      .limit(1);

    if (!requestData) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    // Authorization check
    if (builder && requestData.request.builderId !== builder.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    if (subAuth && requestData.request.assignedSubcontractorId !== subAuth.subcontractor.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const oldStatus = requestData.request.status;
    const actorType = builder ? "builder" : "subcontractor";
    const actorEmail = builder ? builder.email : subAuth!.subcontractor.email;

    // Update request
    await db
      .update(serviceRequests)
      .set({
        status: "acknowledged",
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, id));

    // Write audit log
    try {
      await db.insert(serviceRequestAuditLog).values({
        builderId: requestData.request.builderId,
        serviceRequestId: id,
        actorType,
        actorEmail,
        action: "acknowledged",
        oldStatus,
        newStatus: "acknowledged",
        metadata: { source: builder ? "builder_dashboard" : "sub_portal" },
        timestamp: new Date(),
      });
    } catch {}

    // Notify builder via email when sub acknowledges
    if (subAuth) {
      try {
        const [builderRecord] = await db
          .select()
          .from(builders)
          .where(eq(builders.id, requestData.request.builderId))
          .limit(1);

        if (builderRecord) {
          const subName = subAuth.subcontractor.companyName || subAuth.subcontractor.contactName;
          const address = `${requestData.home.address}, ${requestData.home.city}, ${requestData.home.state}`;
          await sendEmail({
            to: builderRecord.email,
            subject: `Request Acknowledged — ${requestData.request.tradeCategory} at ${requestData.home.address}`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Request Acknowledged</h1>
  </div>
  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; color: #475569; margin-bottom: 20px;">
      <strong>${subName}</strong> has acknowledged the <strong>${requestData.request.tradeCategory}</strong> service request at <strong>${address}</strong>.
    </p>
    <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; color: #5b21b6; font-size: 14px;">The subcontractor has confirmed they've seen this request and will respond with scheduling details.</p>
    </div>
    <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
      View details in your <a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard" style="color: #7c3aed; font-weight: 600;">builder dashboard</a>.
    </p>
  </div>
</body>
</html>`,
            text: `Request Acknowledged\n\n${subName} has acknowledged the ${requestData.request.tradeCategory} service request at ${address}.\n\nThe subcontractor has confirmed they've seen this request and will respond with scheduling details.`,
          });
          console.log("✅ Acknowledge notification email sent to builder");
        }
      } catch (emailErr) {
        console.error("Failed to send builder acknowledge email:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
