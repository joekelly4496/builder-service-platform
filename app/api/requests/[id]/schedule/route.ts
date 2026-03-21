import { db } from "@/lib/db";
import { serviceRequests, serviceRequestAuditLog, homes, subcontractors, homeownerAccounts, builders } from "@/lib/db/schema";
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

    // Notify builder via email about the scheduled appointment
    try {
      const [builderRecord] = await db
        .select()
        .from(builders)
        .where(eq(builders.id, requestData.request.builderId))
        .limit(1);

      if (builderRecord) {
        const schedDate = new Date(scheduledFor).toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric", year: "numeric",
        });
        const windowLabel = timeWindow === "morning" ? "Morning (8 AM – 12 PM)" : timeWindow === "afternoon" ? "Afternoon (12 PM – 4 PM)" : "All Day (8 AM – 4 PM)";
        const address = `${requestData.home.address}, ${requestData.home.city}, ${requestData.home.state}`;
        const subName = requestData.subcontractor.companyName || requestData.subcontractor.contactName;

        await sendEmail({
          to: builderRecord.email,
          subject: `Appointment Scheduled — ${requestData.request.tradeCategory} at ${requestData.home.address}`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Scheduled</h1>
  </div>
  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; color: #475569; margin-bottom: 20px;">
      <strong>${subName}</strong> has scheduled the <strong>${requestData.request.tradeCategory}</strong> service request at <strong>${address}</strong>.
    </p>
    <div style="background: #eef2ff; border-left: 4px solid #4f46e5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #3730a3; font-size: 14px; font-weight: 600;">Date</td>
          <td style="padding: 6px 0; color: #312e81; font-size: 14px; font-weight: 700;">${schedDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #3730a3; font-size: 14px; font-weight: 600;">Window</td>
          <td style="padding: 6px 0; color: #312e81; font-size: 14px; font-weight: 700;">${windowLabel}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #3730a3; font-size: 14px; font-weight: 600;">Homeowner</td>
          <td style="padding: 6px 0; color: #312e81; font-size: 14px;">${requestData.home.homeownerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #3730a3; font-size: 14px; font-weight: 600;">Contractor</td>
          <td style="padding: 6px 0; color: #312e81; font-size: 14px;">${subName}</td>
        </tr>
      </table>
    </div>
    ${notes ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">Notes:</p>
      <p style="margin: 8px 0 0 0; color: #1e3a8a; font-size: 14px;">${notes}</p>
    </div>` : ""}
    <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
      View details in your <a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard" style="color: #4f46e5; font-weight: 600;">builder dashboard</a>.
    </p>
  </div>
</body>
</html>`,
          text: `Appointment Scheduled\n\n${subName} has scheduled the ${requestData.request.tradeCategory} service request at ${address}.\n\nDate: ${schedDate}\nWindow: ${windowLabel}\nHomeowner: ${requestData.home.homeownerName}\nContractor: ${subName}${notes ? `\nNotes: ${notes}` : ""}\n\nView details in your builder dashboard.`,
        });
        console.log("✅ Schedule notification email sent to builder");
      }
    } catch (builderEmailErr) {
      console.error("Failed to send builder schedule email:", builderEmailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error scheduling request:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
