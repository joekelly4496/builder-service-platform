import { db } from "@/lib/db";
import { serviceRequests, serviceRequestAuditLog, homes, subcontractors, homeownerAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emails/send";
import { getScheduleConfirmationEmail } from "@/lib/emails/templates";
import { formatICSDate, escapeICSText } from "@/lib/utils/calendar";
import { createNotification } from "@/lib/notifications/create";
import { sendSMSToHomeowner } from "@/lib/sms/send";
import { getAuthenticatedSubcontractor } from "@/lib/utils/sub-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the subcontractor
    const authResult = await getAuthenticatedSubcontractor(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { scheduledFor, timeWindow, notes } = body;
    // Get request details with home and subcontractor info
    const [requestData] = await db
      .select({
        request: serviceRequests,
        home: homes,
        subcontractor: subcontractors,
      })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .innerJoin(subcontractors, eq(serviceRequests.assignedSubcontractorId, subcontractors.id))
      .where(eq(serviceRequests.id, id))
      .limit(1);
    if (!requestData) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    // Verify the sub is assigned to this request
    if (requestData.request.assignedSubcontractorId !== authResult.subcontractor.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {
      status: "scheduled",
      scheduledFor: new Date(scheduledFor),
    };
    if (notes) {
      updateData.subcontractorNotes = notes;
    }
    await db
      .update(serviceRequests)
      .set(updateData)
      .where(eq(serviceRequests.id, id));
    await db.insert(serviceRequestAuditLog).values({
      builderId: requestData.request.builderId,
      serviceRequestId: id,
      actorType: "subcontractor",
      actorEmail: requestData.subcontractor.email,
      action: "scheduled",
      oldStatus: requestData.request.status,
      newStatus: "scheduled",
      metadata: { scheduledFor, notes },
    });
    // Send confirmation email to homeowner with calendar attachment
    const emailContent = getScheduleConfirmationEmail({
      homeownerName: requestData.home.homeownerName,
      subCompanyName: requestData.subcontractor.companyName,
      subContactName: requestData.subcontractor.contactName,
      subPhone: requestData.subcontractor.phone || "Contact via builder",
      tradeCategory: requestData.request.tradeCategory,
      homeAddress: `${requestData.home.address}, ${requestData.home.city}, ${requestData.home.state}`,
      scheduledFor: new Date(scheduledFor),
      timeWindow,
      notes,
    });
    // Create .ics calendar event based on time window
    const startDate = new Date(scheduledFor);
    let endDate: Date;
    if (timeWindow === "morning") {
      endDate = new Date(startDate);
      endDate.setHours(12, 0, 0, 0);
    } else if (timeWindow === "afternoon") {
      endDate = new Date(startDate);
      endDate.setHours(16, 0, 0, 0);
    } else {
      // allday or fallback
      endDate = new Date(startDate);
      endDate.setHours(16, 0, 0, 0);
    }
    const now = new Date();
    const summary = `${requestData.request.tradeCategory.charAt(0).toUpperCase() + requestData.request.tradeCategory.slice(1)} Service Appointment`;
    const description = `Contractor: ${requestData.subcontractor.companyName}\\nContact: ${requestData.subcontractor.contactName}\\nPhone: ${requestData.subcontractor.phone || "N/A"}${notes ? `\\n\\nNotes: ${notes}` : ""}`;
    const location = `${requestData.home.address}, ${requestData.home.city}, ${requestData.home.state} ${requestData.home.zipCode}`;
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Construction Platform//Service Appointment//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${id}@construction-platform
DTSTAMP:${formatICSDate(now)}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${escapeICSText(summary)}
DESCRIPTION:${escapeICSText(description)}
LOCATION:${escapeICSText(location)}
STATUS:CONFIRMED
ORGANIZER:mailto:${requestData.subcontractor.email}
ATTENDEE:mailto:${requestData.home.homeownerEmail}
END:VEVENT
END:VCALENDAR`;
    const icsBuffer = Buffer.from(icsContent, "utf-8");
    const icsBase64 = icsBuffer.toString("base64");
    // Send email with calendar attachment
    await sendEmail({
      to: requestData.home.homeownerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments: [
        {
          filename: "appointment.ics",
          content: icsBase64,
          contentType: "text/calendar; charset=utf-8; method=REQUEST",
        },
      ],
    });
    console.log("✅ Schedule confirmation email sent to homeowner with calendar attachment");

    // Create in-app notification for homeowner
    try {
      const [account] = await db
        .select()
        .from(homeownerAccounts)
        .where(eq(homeownerAccounts.homeId, requestData.home.id))
        .limit(1);

      if (account) {
        const schedDate = new Date(scheduledFor).toLocaleDateString();
        const windowText = timeWindow === "morning" ? "Morning (8 AM – 12 PM)" : timeWindow === "afternoon" ? "Afternoon (12 PM – 4 PM)" : "All Day (8 AM – 4 PM)";
        await createNotification({
          homeownerId: account.id,
          type: "request_status_change",
          title: `Service Scheduled: ${requestData.request.tradeCategory}`,
          message: `${requestData.subcontractor.companyName} has scheduled your ${requestData.request.tradeCategory} service for ${schedDate}, ${windowText}.`,
          linkUrl: `/homeowner/requests/${id}`,
        });
      }
    } catch (notifErr) {
      console.error("Failed to create schedule notification:", notifErr);
    }

    // Send SMS notification for schedule confirmation
    try {
      const schedDate = new Date(scheduledFor).toLocaleDateString();
      const windowLabel = timeWindow === "morning" ? "Morning (8 AM – 12 PM)" : timeWindow === "afternoon" ? "Afternoon (12 PM – 4 PM)" : "All Day (8 AM – 4 PM)";
      await sendSMSToHomeowner({
        builderId: requestData.home.builderId,
        homeId: requestData.home.id,
        message: `Your ${requestData.request.tradeCategory} service has been scheduled for ${schedDate}, ${windowLabel}. ${requestData.subcontractor.companyName} will be at ${requestData.home.address}.`,
      });
    } catch (smsErr) {
      console.error("Failed to send schedule SMS:", smsErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error scheduling request:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
