import { db } from "@/lib/db";
import { homes, serviceRequests, subcontractors } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { formatICSDate, escapeICSText } from "@/lib/utils/calendar";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ homeId: string }> }
) {
  try {
    const { homeId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const [home] = await db
      .select()
      .from(homes)
      .where(and(eq(homes.id, homeId), eq(homes.calendarToken, token)))
      .limit(1);

    if (!home) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const requests = await db
      .select({
        request: serviceRequests,
        subcontractor: subcontractors,
      })
      .from(serviceRequests)
      .leftJoin(subcontractors, eq(serviceRequests.assignedSubcontractorId, subcontractors.id))
      .where(
        and(
          eq(serviceRequests.homeId, homeId),
          isNotNull(serviceRequests.scheduledFor)
        )
      );

    const now = new Date();
    const icsEvents = requests
      .map(({ request, subcontractor }) => {
        const startDate = new Date(request.scheduledFor!);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

        const summary = `${request.tradeCategory.charAt(0).toUpperCase() + request.tradeCategory.slice(1)} Service Appointment`;
        const description = `Contractor: ${subcontractor?.companyName || "TBD"}\\nContact: ${subcontractor?.contactName || "TBD"}\\nPhone: ${subcontractor?.phone || "N/A"}\\n\\n${request.homeownerDescription || ""}`;
        const location = `${home.address}, ${home.city}, ${home.state} ${home.zipCode}`;

        return `BEGIN:VEVENT
UID:${request.id}@construction-platform
DTSTAMP:${formatICSDate(now)}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${escapeICSText(summary)}
DESCRIPTION:${escapeICSText(description)}
LOCATION:${escapeICSText(location)}
STATUS:CONFIRMED
END:VEVENT`;
      })
      .join("\n");

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Construction Platform//Service Requests//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${home.address} - Service Appointments
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
