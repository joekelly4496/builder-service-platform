import { db } from "@/lib/db";
import { subcontractors, serviceRequests, homes } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { formatICSDate, escapeICSText } from "@/lib/utils/calendar";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subId: string }> }
) {
  try {
    const { subId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const [sub] = await db
      .select()
      .from(subcontractors)
      .where(and(eq(subcontractors.id, subId), eq(subcontractors.calendarToken, token)))
      .limit(1);

    if (!sub) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const requests = await db
      .select({
        request: serviceRequests,
        home: homes,
      })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .where(
        and(
          eq(serviceRequests.assignedSubcontractorId, subId),
          isNotNull(serviceRequests.scheduledFor)
        )
      );

    const now = new Date();
    const icsEvents = requests
      .map(({ request, home }) => {
        const startDate = new Date(request.scheduledFor!);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

        const summary = `${request.tradeCategory.charAt(0).toUpperCase() + request.tradeCategory.slice(1)} Service - ${home.address}`;
        const description = `Homeowner: ${home.homeownerName}\\nPhone: ${home.homeownerPhone || "N/A"}\\n\\n${request.homeownerDescription || ""}`;
        const location = `${home.address}, ${home.city}, ${home.state} ${home.zipCode}`;

        return `BEGIN:VEVENT
UID:${request.id}@construction-platform
DTSTAMP:${formatICSDate(now)}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${escapeICSText(summary)}
DESCRIPTION:${escapeICSText(description)}
LOCATION:${escapeICSText(location)}
STATUS:${request.status === "completed" ? "CONFIRMED" : "TENTATIVE"}
END:VEVENT`;
      })
      .join("\n");

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Construction Platform//Service Requests//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${sub.companyName} - My Appointments
X-WR-TIMEZONE:UTC
${icsEvents}
END:VCALENDAR`;

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="calendar.ics"',
      },
    });
  } catch (error: any) {
    console.error("iCal feed error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
