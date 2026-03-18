import { db } from "@/lib/db";
import { notifications, homeownerAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  // Look up the homeowner account to get builderId
  const [account] = await db
    .select({ builderId: homeownerAccounts.builderId })
    .from(homeownerAccounts)
    .where(eq(homeownerAccounts.id, params.homeownerId))
    .limit(1);

  if (!account) {
    throw new Error(`Homeowner account not found: ${params.homeownerId}`);
  }

  const [notification] = await db
    .insert(notifications)
    .values({
      builderId: account.builderId,
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
