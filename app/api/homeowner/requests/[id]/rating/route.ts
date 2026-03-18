import { db } from "@/lib/db";
import { serviceRequestRatings, serviceRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [rating] = await db
      .select()
      .from(serviceRequestRatings)
      .where(eq(serviceRequestRatings.serviceRequestId, id))
      .limit(1);

    return NextResponse.json({ success: true, rating: rating ?? null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rating, review } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const [serviceRequest] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id))
      .limit(1);

    if (!serviceRequest) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    const [existing] = await db
      .select()
      .from(serviceRequestRatings)
      .where(eq(serviceRequestRatings.serviceRequestId, id))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "You have already rated this request" },
        { status: 400 }
      );
    }

    await db.insert(serviceRequestRatings).values({
      builderId: serviceRequest.builderId,
      serviceRequestId: id,
      homeId: serviceRequest.homeId,
      rating,
      review: review ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}