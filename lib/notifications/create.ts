import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

type NotificationType =
  | "maintenance_due"
  | "request_status_change"
  | "new_message"
  | "schedule_approval"
  | "request_completed";

interface CreateNotificationParams {
  homeownerId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const [notification] = await db
    .insert(notifications)
    .values({
      homeownerId: params.homeownerId,
      type: params.type,
      title: params.title,
      message: params.message,
      linkUrl: params.linkUrl ?? null,
    })
    .returning();

  return notification;
}

export async function createNotificationsForHome(
  homeownerId: string,
  type: NotificationType,
  title: string,
  message: string,
  linkUrl?: string
) {
  return createNotification({ homeownerId, type, title, message, linkUrl });
}
