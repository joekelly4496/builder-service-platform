import { db } from "@/lib/db";
import { reviews, homeownerAccounts, serviceRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// POST /api/homeowner/reviews — homeowner creates a review for a sub
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, subcontractorId, serviceRequestId, rating, comment } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [account] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.supabaseUserId, userId))
      .limit(1);

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Homeowner account not found" },
        { status: 404 }
      );
    }

    if (!subcontractorId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "subcontractorId and rating (1-5) required" },
        { status: 400 }
      );
    }

    // Verify the service request exists and belongs to this homeowner
    if (serviceRequestId) {
      const [sr] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, serviceRequestId))
        .limit(1);

      if (!sr || sr.homeId !== account.homeId) {
        return NextResponse.json(
          { success: false, error: "Service request not found" },
          { status: 404 }
        );
      }

      // Check for duplicate
      const [existing] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(
          and(
            eq(reviews.serviceRequestId, serviceRequestId),
            eq(reviews.homeId, account.homeId),
            eq(reviews.reviewerType, "homeowner")
          )
        )
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { success: false, error: "You have already reviewed this job" },
          { status: 409 }
        );
      }
    }

    const [review] = await db
      .insert(reviews)
      .values({
        subcontractorId,
        serviceRequestId: serviceRequestId || null,
        builderId: account.builderId,
        homeId: account.homeId,
        reviewerType: "homeowner",
        reviewerName: account.email.split("@")[0],
        rating,
        comment: comment || null,
        isPublic: true,
      })
      .returning();

    return NextResponse.json({ success: true, review });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
