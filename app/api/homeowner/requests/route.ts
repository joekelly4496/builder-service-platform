import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serviceRequests,
  homeTradeAssignments,
  serviceRequestAuditLog,
  subcontractors,
  subcontractorMagicLinks,
  homeownerMagicLinks,
  builders,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/emails/send";
import {
  getNewRequestEmail,
  getHomeownerConfirmationEmail,
  getBuilderNewRequestEmail,
} from "@/lib/emails/templates";
import { generateMagicToken, generateMagicLink } from "@/lib/utils/magicLinks";
import { put } from "@vercel/blob";
import { getAuthenticatedHomeowner } from "@/lib/utils/homeowner-auth";
import { createBuilderNotification } from "@/lib/notifications/create-builder";
import { createSubNotification } from "@/lib/notifications/create-sub";

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

    // Send builder notification email
    const [builder] = await db
      .select()
      .from(builders)
      .where(eq(builders.id, home.builderId))
      .limit(1);

    if (builder) {
      const builderEmailContent = getBuilderNewRequestEmail({
        builderName: builder.contactName,
        homeownerName: home.homeownerName,
        tradeCategory,
        homeAddress: `${home.address}, ${home.city}, ${home.state}`,
        description,
        priority,
        subcontractorName: subcontractor.companyName,
      });

      await sendEmail({
        to: builder.email,
        subject: builderEmailContent.subject,
        html: builderEmailContent.html,
        text: builderEmailContent.text,
      });
    }

    // In-app notification for builder
    try {
      await createBuilderNotification({
        builderId: home.builderId,
        type: "new_request",
        title: `New Request: ${tradeCategory}`,
        message: `${home.homeownerName} submitted a ${priority} ${tradeCategory} request at ${home.address}. Assigned to ${subcontractor.companyName}.`,
        linkUrl: `/dashboard`,
      });
    } catch (notifErr) {
      console.error("Failed to create builder notification:", notifErr);
    }

    // In-app notification for subcontractor
    try {
      await createSubNotification({
        subcontractorId: assignment.subcontractorId,
        type: "request_assigned",
        title: `New Request Assigned: ${tradeCategory}`,
        message: `${priority.charAt(0).toUpperCase() + priority.slice(1)} ${tradeCategory} request at ${home.address}, ${home.city}. Please acknowledge promptly.`,
        linkUrl: `/sub/requests/${serviceRequest.id}`,
      });
    } catch (notifErr) {
      console.error("Failed to create sub notification:", notifErr);
    }

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
