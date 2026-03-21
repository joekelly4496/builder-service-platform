import { db } from "@/lib/db";
import { subNotifications } from "@/lib/db/schema";

interface CreateSubNotificationParams {
  subcontractorId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
}

export async function createSubNotification(params: CreateSubNotificationParams) {
  try {
    const [notification] = await db
      .insert(subNotifications)
      .values({
        subcontractorId: params.subcontractorId,
        type: params.type,
        title: params.title,
        message: params.message,
        linkUrl: params.linkUrl ?? null,
      })
      .returning();

    return notification;
  } catch (error) {
    console.error("❌ createSubNotification failed:", error);
    throw error;
  }
}
