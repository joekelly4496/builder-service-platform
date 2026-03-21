import { db } from "@/lib/db";
import { builderNotifications } from "@/lib/db/schema";

interface CreateBuilderNotificationParams {
  builderId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
}

export async function createBuilderNotification(params: CreateBuilderNotificationParams) {
  const [notification] = await db
    .insert(builderNotifications)
    .values({
      builderId: params.builderId,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl ?? null,
    })
    .returning();

  return notification;
}
