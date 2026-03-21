import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serviceRequests,
  homeTradeAssignments,
  serviceRequestAuditLog,
  subcontractors,
  subcontractorMagicLinks,
  homeownerMagicLinks,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/emails/send";
import {
  getNewRequestEmail,
  getHomeownerConfirmationEmail,
} from "@/lib/emails/templates";
import { generateMagicToken, generateMagicLink } from "@/lib/utils/magicLinks";
import { put } from "@vercel/blob";
import { getAuthenticatedHomeowner } from "@/lib/utils/homeowner-auth";

// POST /api/homeowner/requests — submit a new service request
export async function POST(request: Request) {
  try {
    const result = await getAuthenticatedHomeowner();
    if (!result) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { home } = result;
    const homeownerEmail = home.homeownerEmail;

    const formData = await request.formData();
    const tradeCategory = String(formData.get("tradeCategory") ?? "");
    const priority = String(formData.get("priority") ?? "normal");
    const description = String(formData.get("description") ?? "");
    const photoFiles = formData.getAll("photos").filter((v): v is File => v instanceof File);

    if (!tradeCategory || !priority || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the assigned sub for this trade category
    const [assignment] = await db
      .select()
      .from(homeTradeAssignments)
      .where(
        and(
          eq(homeTradeAssignments.homeId, home.id),
          eq(homeTradeAssignments.tradeCategory, tradeCategory)
        )
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { error: `No subcontractor assigned for ${tradeCategory}` },
        { status: 400 }
      );
    }

    const [subcontractor] = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, assignment.subcontractorId))
      .limit(1);

    if (!subcontractor) {
      return NextResponse.json(
        { error: "Assigned subcontractor not found" },
        { status: 404 }
      );
    }

    // Upload photos
    const photoUrls: string[] = [];
    if (photoFiles.length > 0) {
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        if (!file || file.size === 0) continue;

        const safeBase = (file.name || "photo")
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9.\-_]/g, "");
        const key = `requests/${home.id}/${Date.now()}-${i}-${safeBase}`;

        try {
          const blob = await put(key, file, {
            access: "public",
            addRandomSuffix: true,
          });
          photoUrls.push(blob.url);
        } catch (uploadError: any) {
          console.error("Photo upload error:", uploadError?.message ?? uploadError);
        }
      }
    }

    // SLA deadlines
    const now = new Date();
    let acknowledgeMinutes = 2880;
    let scheduleMinutes = 7200;

    if (priority === "urgent") {
      acknowledgeMinutes = 120;
      scheduleMinutes = 240;
    } else if (priority === "low") {
      acknowledgeMinutes = 7200;
      scheduleMinutes = 14400;
    }

    const slaAcknowledgeDeadline = new Date(now.getTime() + acknowledgeMinutes * 60000);
    const slaScheduleDeadline = new Date(now.getTime() + scheduleMinutes * 60000);

    const [serviceRequest] = await db
      .insert(serviceRequests)
      .values({
        builderId: home.builderId,
        homeId: home.id,
        assignedSubcontractorId: assignment.subcontractorId,
        tradeCategory,
        priority: priority as "urgent" | "normal" | "low",
        status: "submitted",
        homeownerDescription: description,
        homeownerContactPreference: homeownerEmail,
        photoUrls,
        slaAcknowledgeDeadline,
        slaScheduleDeadline,
      })
      .returning();

    await db.insert(serviceRequestAuditLog).values({
      builderId: home.builderId,
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
        photoCount: photoUrls.length,
        photoUrls,
      },
    });

    // Generate magic links for email notifications
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const subToken = generateMagicToken();
    const subExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(subcontractorMagicLinks).values({
      subcontractorId: assignment.subcontractorId,
      serviceRequestId: serviceRequest.id,
      token: subToken,
      expiresAt: subExpiresAt,
    });

    const subMagicLink = generateMagicLink(subToken, baseUrl);

    const homeownerToken = generateMagicToken();
    const homeownerExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(homeownerMagicLinks).values({
      homeId: home.id,
      serviceRequestId: serviceRequest.id,
      token: homeownerToken,
      expiresAt: homeownerExpiresAt,
    });

    const homeownerMagicLink = `${baseUrl}/homeowner/${homeownerToken}`;

    // Send email notifications
    const subEmailContent = getNewRequestEmail({
      subName: subcontractor.contactName,
      companyName: home.homeownerName,
      tradeCategory,
      homeAddress: `${home.address}, ${home.city}, ${home.state}`,
      description,
      priority,
      magicLink: subMagicLink,
    });

    await sendEmail({
      to: subcontractor.email,
      subject: subEmailContent.subject,
      html: subEmailContent.html,
      text: subEmailContent.text,
    });

    const homeownerEmailContent = getHomeownerConfirmationEmail({
      homeownerName: home.homeownerName,
      tradeCategory,
      priority,
      description,
      magicLink: homeownerMagicLink,
    });

    await sendEmail({
      to: homeownerEmail,
      subject: homeownerEmailContent.subject,
      html: homeownerEmailContent.html,
      text: homeownerEmailContent.text,
    });

    return NextResponse.json({
      success: true,
      message: "Service request created successfully!",
      data: {
        requestId: serviceRequest.id,
        photoCount: photoUrls.length,
      },
    });
  } catch (error: any) {
    console.error("Error submitting homeowner request:", error);
    return NextResponse.json(
      { error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
