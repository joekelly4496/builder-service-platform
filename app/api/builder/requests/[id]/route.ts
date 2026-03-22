import { db } from "@/lib/db";
import { serviceRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

// PATCH /api/builder/requests/[id] — update job cost (builder only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { jobCostCents } = body;

    if (jobCostCents !== undefined && jobCostCents !== null) {
      if (typeof jobCostCents !== "number" || jobCostCents < 0) {
        return NextResponse.json(
          { success: false, error: "jobCostCents must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    const [existing] = await db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.id, id),
          eq(serviceRequests.builderId, builder.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(serviceRequests)
      .set({
        jobCostCents: jobCostCents ?? null,
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, id))
      .returning();

    return NextResponse.json({ success: true, request: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
