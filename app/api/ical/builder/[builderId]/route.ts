import { db } from "@/lib/db";
import { builders, serviceRequests, homes, subcontractors } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { formatICSDate, escapeICSText } from "@/lib/utils/calendar";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ builderId: string }> }
) {
  try {
    const { builderId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verify token
    const [builder] = await db
      .select()
      .from(builders)
      .where(and(eq(builders.id, builderId), eq(builders.calendarToken, token)))
      .limit(1);

    if (!builder) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Get all scheduled requests for this builder
    const requests = await db
      .select({
        request: serviceRequests,
        home: homes,
        subcontractor: subcontractors,
      })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .leftJoin(subcontractors, eq(serviceRequests.assignedSubcontractorId, subcontractors.id))
      .where(
        and(
          eq(homes.builderId, builderId),
          isNotNull(serviceRequests.scheduledFor)
        )
      );

    // Generate iCal feed
    const now = new Date();
    const icsEvents = requests
      .map(({ request, home, subcontractor }) => {
        const startDate = new Date(request.scheduledFor!);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

        const summary = `${request.tradeCategory.charAt(0).toUpperCase() + request.tradeCategory.slice(1)} Service - ${home.address}`;
        const description = `${request.homeownerDescription || ""}\\n\\nView details: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests/${request.id}`;
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
X-WR-CALNAME:${builder.companyName} - Service Requests
X-WR-TIMEZONE:UTC
X-WR-CALDESC:All scheduled service requests
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
