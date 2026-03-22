import { db } from "@/lib/db";
import { subSmsMessages } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedSubcontractor } from "@/lib/utils/sub-auth";
import { subSendSMS } from "@/lib/sms/sub-send";

// GET /api/sub/sms?serviceRequestId=xxx — list SMS messages for a job
export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedSubcontractor(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceRequestId = searchParams.get("serviceRequestId");

    const conditions = [eq(subSmsMessages.subcontractorId, authResult.subcontractor.id)];
    if (serviceRequestId) {
      conditions.push(eq(subSmsMessages.serviceRequestId, serviceRequestId));
    }

    const messages = await db
      .select()
      .from(subSmsMessages)
      .where(and(...conditions))
      .orderBy(desc(subSmsMessages.createdAt))
      .limit(100);

    return NextResponse.json({ success: true, messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/sub/sms — send an SMS from the sub's business number
export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedSubcontractor(request);
    if (!authResult) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { toNumber, message, serviceRequestId } = body;

    if (!toNumber || !message) {
      return NextResponse.json(
        { success: false, error: "toNumber and message are required" },
        { status: 400 }
      );
    }

    const result = await subSendSMS({
      subcontractorId: authResult.subcontractor.id,
      serviceRequestId: serviceRequestId || undefined,
      toNumber,
      message,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageSid: result.messageSid });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
