import { db } from "@/lib/db";
import {
  serviceRequests,
  homes,
  homeTradeAssignments,
  serviceRequestAuditLog,
  subcontractors,
  subcontractorMagicLinks,
  homeownerMagicLinks,
} from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/emails/send";
import {
  getNewRequestEmail,
  getHomeownerConfirmationEmail,
} from "@/lib/emails/templates";
import { generateMagicToken, generateMagicLink } from "@/lib/utils/magicLinks";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  console.log("========== SUBMIT REQUEST STARTED ==========");

  try {
    const formData = await request.formData();

    const homeId = String(formData.get("homeId") ?? "");
    const tradeCategory = String(formData.get("tradeCategory") ?? "");
    const priority = String(formData.get("priority") ?? "normal");
    const description = String(formData.get("description") ?? "");
    const homeownerEmail = String(formData.get("homeownerEmail") ?? "");
    const photoFiles = formData.getAll("photos").filter((v): v is File => v instanceof File);

    console.log("========== FORM DATA ==========");
    console.log("homeId:", homeId);
    console.log("tradeCategory:", tradeCategory);
    console.log("priority:", priority);
    console.log("homeownerEmail:", homeownerEmail);
    console.log("photoFiles count:", photoFiles.length);

    if (!homeId || !tradeCategory || !priority || !description || !homeownerEmail) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [home] = await db.select().from(homes).where(eq(homes.id, homeId)).limit(1);

    if (!home) {
      return NextResponse.json({ success: false, error: "Home not found" }, { status: 404 });
    }

    const [assignment] = await db
      .select()
      .from(homeTradeAssignments)
      .where(
        and(
          eq(homeTradeAssignments.homeId, homeId),
          eq(homeTradeAssignments.tradeCategory, tradeCategory)
        )
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: `No subcontractor assigned for ${tradeCategory}` },
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
        { success: false, error: "Assigned subcontractor not found" },
        { status: 404 }
      );
    }

    const photoUrls: string[] = [];

    console.log("========== STARTING PHOTO UPLOAD ==========");
    if (photoFiles.length > 0) {
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];

        console.log(`--- File ${i + 1}/${photoFiles.length} ---`);
        console.log("Name:", file.name);
        console.log("Size:", file.size);
        console.log("Type:", file.type);

        if (!file || file.size === 0) {
          console.log("⚠️ Skipping file (missing or size=0)");
          continue;
        }

        const safeBase = (file.name || "photo")
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9.\-_]/g, "");
        const key = `requests/${homeId}/${Date.now()}-${i}-${safeBase}`;

        try {
          const blob = await put(key, file, {
            access: "public",
            addRandomSuffix: true,
          });
          photoUrls.push(blob.url);
          console.log("✅ Uploaded:", blob.url);
        } catch (uploadError: any) {
          console.error("❌ Upload error:", uploadError?.message ?? uploadError);
        }
      }
    } else {
      console.log("No files provided for upload");
    }

    console.log("========== PHOTO UPLOAD COMPLETE ==========");
    console.log("Total photos successfully uploaded:", photoUrls.length);

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
        homeId,
        assignedSubcontractorId: assignment.subcontractorId,
        tradeCategory,
        priority: priority as "urgent" | "normal" | "low",
        status: "submitted",
        homeownerDescription: description,
        homeownerContactPreference: homeownerEmail,
        photoUrls: photoUrls,
        slaAcknowledgeDeadline,
        slaScheduleDeadline,
      })
      .returning();

    console.log("✅ Request created:", serviceRequest.id);

    await db.insert(serviceRequestAuditLog).values({
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
      homeId,
      serviceRequestId: serviceRequest.id,
      token: homeownerToken,
      expiresAt: homeownerExpiresAt,
    });

    const homeownerMagicLink = `${baseUrl}/homeowner/${homeownerToken}`;

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

    console.log("========== SUBMIT REQUEST COMPLETED ==========");

    return NextResponse.json({
      success: true,
      message: "Service request created successfully!",
      data: {
        requestId: serviceRequest.id,
        photoCount: photoUrls.length,
        photoUrls,
      },
    });
  } catch (error: any) {
    console.error("❌ ERROR:", error);
    return NextResponse.json({ success: false, error: error?.message ?? "Unknown error" }, { status: 500 });
  }
}