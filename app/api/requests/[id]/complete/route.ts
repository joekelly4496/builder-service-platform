import { db } from "@/lib/db";
import { serviceRequests, serviceRequestAuditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("========== COMPLETE REQUEST STARTED ==========");

  try {
    const { id } = await params;
    const formData = await request.formData();

    const completionNotes = String(formData.get("completionNotes") ?? "");
    const photoFiles = formData.getAll("photos").filter((v): v is File => v instanceof File);

    console.log("Request ID:", id);
    console.log("Completion notes:", completionNotes);
    console.log("Number of photos:", photoFiles.length);

    const [existingRequest] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id))
      .limit(1);

    if (!existingRequest) {
      console.log("❌ Request not found");
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    console.log("Current status:", existingRequest.status);

    // ========= Upload completion photos =========
    const photoUrls: string[] = [];

    if (photoFiles.length > 0) {
      console.log("Uploading completion photos to Vercel Blob...");

      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        if (!file || file.size === 0) continue;

        const safeBase = (file.name || "completion-photo")
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9.\-_]/g, "");
        const key = `requests/${id}/completion/${Date.now()}-${i}-${safeBase}`;

        try {
          const blob = await put(key, file, {
            access: "public",
            addRandomSuffix: true,
          });
          photoUrls.push(blob.url);
          console.log("✅ Completion photo uploaded:", blob.url);
        } catch (uploadError: any) {
          console.error("❌ Completion photo upload error:", uploadError?.message ?? uploadError);
        }
      }
    }

    console.log("Total completion photos uploaded:", photoUrls.length);

    // ✅ IMPORTANT: Your schema field is `completionPhotos`, NOT `completion_photos`
    await db
      .update(serviceRequests)
      .set({
        status: "completed",
        completionNotes: completionNotes || null,
        completionPhotos: photoUrls, // ✅ FIXED
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, id));

    console.log("✅ Request marked complete in database");

    await db.insert(serviceRequestAuditLog).values({
      serviceRequestId: id,
      actorType: "subcontractor",
      actorEmail: null,
      action: "completed",
      oldStatus: existingRequest.status,
      newStatus: "completed",
      metadata: {
        completionNotes,
        photoCount: photoUrls.length,
        photoUrls,
      },
    });

    console.log("✅ Audit log created");
    console.log("========== COMPLETE REQUEST FINISHED ==========");

    return NextResponse.json({
      success: true,
      photoCount: photoUrls.length,
      photoUrls,
    });
  } catch (error: any) {
    console.error("❌ ERROR IN COMPLETE REQUEST:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}