import { db } from "@/lib/db";
import { serviceRequests, homes, subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { formatICSDate, escapeICSText } from "@/lib/utils/calendar";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [data] = await db
      .select({
        request: serviceRequests,
        home: homes,
        subcontractor: subcontractors,
      })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .leftJoin(subcontractors, eq(serviceRequests.assignedSubcontractorId, subcontractors.id))
      .where(eq(serviceRequests.id, id))
      .limit(1);

    if (!data || !data.request.scheduledFor) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const { request: req, home, subcontractor } = data;
    const startDate = new Date(req.scheduledFor!);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const now = new Date();

    const summary = `${req.tradeCategory.charAt(0).toUpperCase() + req.tradeCategory.slice(1)} Service - ${home.address}`;
    const description = `Contractor: ${subcontractor?.companyName || "TBD"}\\nContact: ${subcontractor?.contactName || "TBD"}\\nPhone: ${subcontractor?.phone || "N/A"}\\n\\n${req.homeownerDescription || ""}`;
    const location = `${home.address}, ${home.city}, ${home.state} ${home.zipCode}`;

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Construction Platform//Service Requests//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${req.id}@construction-platform
DTSTAMP:${formatICSDate(now)}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${escapeICSText(summary)}
DESCRIPTION:${escapeICSText(description)}
LOCATION:${escapeICSText(location)}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="appointment-${id.slice(0, 8)}.ics"`,
      },
    });
  } catch (error: any) {
    console.error("iCal download error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

