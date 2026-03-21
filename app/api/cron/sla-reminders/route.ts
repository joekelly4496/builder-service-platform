import { db } from "@/lib/db";
import { serviceRequests, subcontractors, homes } from "@/lib/db/schema";
import { eq, and, lt, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emails/send";
import { createSubNotification } from "@/lib/notifications/create-sub";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  console.log("========== SLA REMINDER CRON STARTED ==========");

  try {
    // Only allow requests with the secret token
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("❌ Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    console.log("Current time:", now.toISOString());
    console.log("Checking for deadlines between:", now.toISOString(), "and", oneHourFromNow.toISOString());

    // Find requests that:
    // 1. Are still in "submitted" status
    // 2. Have SLA deadline between now and 1 hour from now
    // 3. Haven't been sent a reminder yet
    const requestsNeedingReminder = await db
      .select({
        request: serviceRequests,
        subcontractor: subcontractors,
        home: homes,
      })
      .from(serviceRequests)
      .innerJoin(subcontractors, eq(serviceRequests.assignedSubcontractorId, subcontractors.id))
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .where(
        and(
          eq(serviceRequests.status, "submitted"),
          gte(serviceRequests.slaAcknowledgeDeadline, now),
          lt(serviceRequests.slaAcknowledgeDeadline, oneHourFromNow),
          eq(serviceRequests.slaReminderSent, false)
        )
      );

    console.log(`Found ${requestsNeedingReminder.length} requests needing reminders`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const { request, subcontractor, home } of requestsNeedingReminder) {
      try {
        console.log(`Sending reminder for request ${request.id} to ${subcontractor.email}`);

        const minutesRemaining = Math.round(
          (new Date(request.slaAcknowledgeDeadline).getTime() - now.getTime()) / (1000 * 60)
        );

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 10px; margin-top: 20px; }
              .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
              .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
              .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">⚠️ SLA Reminder</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Response Required Soon</p>
              </div>
              
              <div class="content">
                <p>Hello ${subcontractor.contactName},</p>
                
                <div class="warning">
                  <strong>⏰ ${minutesRemaining} minutes remaining to acknowledge this request!</strong>
                </div>
                
                <p>You have a service request that requires acknowledgment within the next hour to meet the SLA deadline.</p>
                
                <div class="details">
                  <p><strong>Trade:</strong> ${request.tradeCategory}</p>
                  <p><strong>Priority:</strong> ${request.priority.toUpperCase()}</p>
                  <p><strong>Location:</strong> ${home.address}, ${home.city}, ${home.state}</p>
                  <p><strong>Homeowner:</strong> ${home.homeownerName}</p>
                  <p><strong>Description:</strong> ${request.homeownerDescription}</p>
                  <p><strong>SLA Deadline:</strong> ${new Date(request.slaAcknowledgeDeadline).toLocaleString()}</p>
                </div>
                
                <p><strong>Please acknowledge this request immediately to avoid an SLA breach.</strong></p>
                
                <div style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/requests/${request.id}" class="button">
                    View Request →
                  </a>
                </div>
              </div>
              
              <div class="footer">
                <p>This is an automated SLA reminder from your service management system.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const result = await sendEmail({
          to: subcontractor.email,
          subject: `⚠️ SLA Reminder: ${request.tradeCategory} request - ${minutesRemaining} min remaining`,
          html: emailHtml,
          text: `SLA Reminder: You have ${minutesRemaining} minutes to acknowledge the ${request.tradeCategory} request at ${home.address}. Visit the portal to respond immediately.`,
        });

        if (result.success) {
          // Mark as reminded
          await db
            .update(serviceRequests)
            .set({ slaReminderSent: true })
            .where(eq(serviceRequests.id, request.id));

          // In-app notification for sub
          try {
            await createSubNotification({
              subcontractorId: subcontractor.id,
              type: "sla_reminder",
              title: `SLA Reminder: ${request.tradeCategory}`,
              message: `${minutesRemaining} minutes remaining to acknowledge the ${request.tradeCategory} request at ${home.address}.`,
              linkUrl: `/sub/requests/${request.id}`,
            });
          } catch (notifErr) {
            console.error("Failed to create SLA sub notification:", notifErr);
          }

          console.log(`✅ Reminder sent for request ${request.id}`);
          emailsSent++;
        } else {
          console.error(`❌ Failed to send reminder for request ${request.id}`);
          emailsFailed++;
        }
      } catch (emailError) {
        console.error(`Error sending reminder for request ${request.id}:`, emailError);
        emailsFailed++;
      }
    }

    console.log(`========== SLA REMINDER CRON COMPLETED ==========`);
    console.log(`Emails sent: ${emailsSent}`);
    console.log(`Emails failed: ${emailsFailed}`);

    return NextResponse.json({
      success: true,
      requestsChecked: requestsNeedingReminder.length,
      emailsSent,
      emailsFailed,
    });
  } catch (error: any) {
    console.error("❌ CRON ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}