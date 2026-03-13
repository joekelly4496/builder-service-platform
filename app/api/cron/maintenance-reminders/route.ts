import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceReminders, maintenanceItems, homes, homeownerAccounts } from "@/lib/db/schema";
import { eq, lte, and } from "drizzle-orm";
import { Resend } from "resend";
import { createNotification } from "@/lib/notifications/create";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const now = new Date();
    // Find all active reminders that are due (nextDueDate <= now)
    const dueReminders = await db
      .select({
        reminder: maintenanceReminders,
        item: maintenanceItems,
        home: homes,
      })
      .from(maintenanceReminders)
      .innerJoin(
        maintenanceItems,
        eq(maintenanceReminders.maintenanceItemId, maintenanceItems.id)
      )
      .innerJoin(homes, eq(maintenanceReminders.homeId, homes.id))
      .where(
        and(
          lte(maintenanceReminders.nextDueDate, now),
          eq(maintenanceReminders.isActive, true)
        )
      );
    if (dueReminders.length === 0) {
      return NextResponse.json({
        message: "No reminders due today",
        sent: 0,
      });
    }
    let sentCount = 0;
    const errors: string[] = [];
    for (const { reminder, item, home } of dueReminders) {
      try {
        const homeownerEmail = home.homeownerEmail;
        const homeownerName = home.homeownerName;
        if (!homeownerEmail) {
          errors.push(
            `No homeowner email on home ${home.id} — skipping reminder "${reminder.title}"`
          );
          continue;
        }
        // Send the reminder email via Resend
        await resend.emails.send({
          from:
            process.env.EMAIL_FROM ||
            "Maintenance <notifications@yourdomain.com>",
          to: homeownerEmail,
          subject: `Maintenance Reminder: ${reminder.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Maintenance Reminder</h2>
              <p>Hi ${homeownerName},</p>
              <p>This is a reminder that the following maintenance is due for your home at
                <strong>${home.address}, ${home.city}, ${home.state} ${home.zipCode}</strong>:</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0; color: #333;">${reminder.title}</h3>
                ${reminder.description ? `<p style="margin: 0 0 8px 0; color: #666;">${reminder.description}</p>` : ""}
                <p style="margin: 0; color: #888; font-size: 14px;">
                  Related item: ${item.name} (${item.tradeCategory})
                </p>
                <p style="margin: 4px 0 0 0; color: #888; font-size: 14px;">
                  Frequency: every ${reminder.intervalDays} days
                </p>
              </div>
              <p>Please take care of this at your earliest convenience. Regular maintenance
                helps keep your home in great shape!</p>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">
                You received this email because you are the registered homeowner for this property.
              </p>
            </div>
          `,
        });

        // Create in-app notification for the homeowner
        try {
          const [account] = await db
            .select()
            .from(homeownerAccounts)
            .where(eq(homeownerAccounts.homeId, home.id))
            .limit(1);

          if (account) {
            await createNotification({
              homeownerId: account.id,
              type: "maintenance_due",
              title: `Maintenance Due: ${reminder.title}`,
              message: `${reminder.description || item.name} is due for your home at ${home.address}.`,
              linkUrl: "/homeowner/maintenance",
            });
          }
        } catch (notifErr) {
          console.error(`Failed to create in-app notification for reminder ${reminder.id}:`, notifErr);
        }

        // Advance nextDueDate and record lastReminderSentAt
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + reminder.intervalDays);
        await db
          .update(maintenanceReminders)
          .set({
            nextDueDate: nextDate,
            lastReminderSentAt: now,
            updatedAt: now,
          })
          .where(eq(maintenanceReminders.id, reminder.id));
        sentCount++;
      } catch (itemError) {
        console.error(
          `Error processing reminder ${reminder.id}:`,
          itemError
        );
        errors.push(
          `Failed to process reminder ${reminder.id}: ${reminder.title}`
        );
      }
    }
    return NextResponse.json({
      message: `Processed ${dueReminders.length} due reminders, sent ${sentCount} emails`,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
