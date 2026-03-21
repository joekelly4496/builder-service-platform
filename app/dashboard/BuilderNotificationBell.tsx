"use client";

import NotificationBell from "@/app/components/NotificationBell";

export default function BuilderNotificationBell() {
  return <NotificationBell apiUrl="/api/builder/notifications" variant="light" />;
}
