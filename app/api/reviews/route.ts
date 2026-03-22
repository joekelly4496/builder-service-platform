import { db } from "@/lib/db";
import { reviews, subcontractors } from "@/lib/db/schema";
import { eq, and, desc, avg, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

export const dynamic = "force-dynamic";

// GET /api/reviews?subcontractorId=xxx — public reviews for a sub
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subcontractorId = searchParams.get("subcontractorId");

    if (!subcontractorId) {
      return NextResponse.json(
        { success: false, error: "subcontractorId is required" },
        { status: 400 }
      );
    }

    const reviewList = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.subcontractorId, subcontractorId),
          eq(reviews.isPublic, true)
        )
      )
      .orderBy(desc(reviews.createdAt));

    // Calculate aggregate stats
    const [stats] = await db
      .select({
        avgRating: avg(reviews.rating),
        totalCount: count(),
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.subcontractorId, subcontractorId),
          eq(reviews.isPublic, true)
        )
      );

    return NextResponse.json({
      success: true,
      reviews: reviewList,
      stats: {
        averageRating: stats?.avgRating ? parseFloat(String(stats.avgRating)) : 0,
        totalReviews: Number(stats?.totalCount ?? 0),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/reviews — create a review (builder-authenticated)
export async function POST(request: Request) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      subcontractorId,
      serviceRequestId,
      homeId,
      rating,
      comment,
      tradeCategory,
      reviewerName,
    } = body;

    if (!subcontractorId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "subcontractorId and rating (1-5) are required" },
        { status: 400 }
      );
    }

    // Verify the sub exists
    const [sub] = await db
      .select({ id: subcontractors.id })
      .from(subcontractors)
      .where(eq(subcontractors.id, subcontractorId))
      .limit(1);

    if (!sub) {
      return NextResponse.json(
        { success: false, error: "Subcontractor not found" },
        { status: 404 }
      );
    }

    // Check for duplicate review on the same service request
    if (serviceRequestId) {
      const [existing] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(
          and(
            eq(reviews.serviceRequestId, serviceRequestId),
            eq(reviews.builderId, builder.id),
            eq(reviews.reviewerType, "builder")
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
        builderId: builder.id,
        homeId: homeId || null,
        reviewerType: "builder",
        reviewerName: reviewerName || builder.contactName || builder.companyName,
        rating,
        comment: comment || null,
        tradeCategory: tradeCategory || null,
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
