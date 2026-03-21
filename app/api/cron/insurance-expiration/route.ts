import { db } from "@/lib/db";
import {
  subcontractors,
  builderSubcontractorRelationships,
  builders,
} from "@/lib/db/schema";
import { eq, and, lte, gte, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/emails/send";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  console.log("========== INSURANCE EXPIRATION CRON STARTED ==========");

  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    // Find subs with insurance expiring within 30 days
    const expiringSubs = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          isNotNull(subcontractors.insuranceExpiresAt),
          lte(subcontractors.insuranceExpiresAt, thirtyDaysFromNow),
          gte(subcontractors.insuranceExpiresAt, now),
          eq(subcontractors.status, "active")
        )
      );

    console.log(`Found ${expiringSubs.length} subs with expiring insurance`);

    let emailsSent = 0;

    for (const sub of expiringSubs) {
      const daysUntilExpiry = Math.ceil(
        (new Date(sub.insuranceExpiresAt!).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Only alert at 30, 14, 7, 3, 1 day marks
      if (![30, 14, 7, 3, 1].includes(daysUntilExpiry)) continue;

      // Email the subcontractor
      await sendEmail({
        to: sub.email,
        subject: `Insurance expiring in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`,
        html: `
          <h2>Insurance Expiration Notice</h2>
          <p>Hi ${sub.contactName},</p>
          <p>Your insurance on file for <strong>${sub.companyName}</strong> expires on
          <strong>${new Date(sub.insuranceExpiresAt!).toLocaleDateString()}</strong>
          (${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} from now).</p>
          <p>Please update your insurance document to maintain your verified status.</p>
          <p>— Homefront</p>
        `,
        text: `Hi ${sub.contactName}, your insurance expires on ${new Date(sub.insuranceExpiresAt!).toLocaleDateString()} (${daysUntilExpiry} days). Please update your insurance document.`,
      });
      emailsSent++;

      // Also notify each builder who has an active relationship with this sub
      const relationships = await db
        .select({ builder: builders })
        .from(builderSubcontractorRelationships)
        .innerJoin(
          builders,
          eq(builderSubcontractorRelationships.builderId, builders.id)
        )
        .where(
          and(
            eq(
              builderSubcontractorRelationships.subcontractorId,
              sub.id
            ),
            eq(builderSubcontractorRelationships.status, "active")
          )
        );

      for (const { builder } of relationships) {
        if (!builder.email) continue;
        await sendEmail({
          to: builder.email,
          subject: `Sub insurance expiring: ${sub.companyName}`,
          html: `
            <h2>Subcontractor Insurance Alert</h2>
            <p>The insurance for <strong>${sub.companyName}</strong> (${sub.contactName})
            expires on <strong>${new Date(sub.insuranceExpiresAt!).toLocaleDateString()}</strong>
            (${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}).</p>
            <p>— Homefront</p>
          `,
          text: `Insurance for ${sub.companyName} expires on ${new Date(sub.insuranceExpiresAt!).toLocaleDateString()} (${daysUntilExpiry} days).`,
        });
        emailsSent++;
      }
    }

    // Also check for already-expired insurance and remove verified status
    const expiredSubs = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          isNotNull(subcontractors.insuranceExpiresAt),
          lte(subcontractors.insuranceExpiresAt, now),
          eq(subcontractors.isVerified, true)
        )
      );

    for (const sub of expiredSubs) {
      await db
        .update(subcontractors)
        .set({ isVerified: false, updatedAt: new Date() })
        .where(eq(subcontractors.id, sub.id));
      console.log(
        `Removed verified status from ${sub.companyName} (insurance expired)`
      );
    }

    console.log(
      `Done: ${emailsSent} emails sent, ${expiredSubs.length} subs un-verified`
    );

    return NextResponse.json({
      success: true,
      expiringSubs: expiringSubs.length,
      emailsSent,
      unverified: expiredSubs.length,
    });
  } catch (error: unknown) {
    console.error("Insurance expiration cron error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
