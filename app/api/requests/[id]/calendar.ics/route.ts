import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests, homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function toIcsDate(d: Date) {
  // YYYYMMDDTHHMMSSZ (UTC)
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function esc(s: string) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const rows = await db
    .select({ req: serviceRequests, home: homes })
    .from(serviceRequests)
    .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
    .where(eq(serviceRequests.id, id))
    .limit(1);

  if (!rows[0]) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { req, home } = rows[0];

  if (!req.scheduledFor) {
    return new NextResponse("Not scheduled", { status: 400 });
  }

  const start = new Date(req.scheduledFor);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default

  const summary = `${req.tradeCategory} Service Appointment`;
  const description = req.homeownerDescription || "";
  const location = `${home.address}, ${home.city}, ${home.state} ${home.zipCode}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AfterBuild//HomeCare//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${esc(req.id)}@afterbuild`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="service-appointment-${req.id.slice(
        0,
        8
      )}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}