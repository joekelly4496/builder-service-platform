import { db } from "@/lib/db";
import {
  serviceRequests,
  homeownerAccounts,
  subcontractors,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

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
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Fetch all completed/closed requests for this homeowner's home
    const history = await db
      .select({
        id: serviceRequests.id,
        tradeCategory: serviceRequests.tradeCategory,
        status: serviceRequests.status,
        homeownerDescription: serviceRequests.homeownerDescription,
        completionNotes: serviceRequests.completionNotes,
        completionPhotos: serviceRequests.completionPhotos,
        photoUrls: serviceRequests.photoUrls,
        jobCostCents: serviceRequests.jobCostCents,
        createdAt: serviceRequests.createdAt,
        completedAt: serviceRequests.completedAt,
        subCompanyName: subcontractors.companyName,
        subContactName: subcontractors.contactName,
        subId: subcontractors.id,
      })
      .from(serviceRequests)
      .leftJoin(
        subcontractors,
        eq(serviceRequests.assignedSubcontractorId, subcontractors.id)
      )
      .where(
        and(
          eq(serviceRequests.homeId, account.homeId),
          eq(serviceRequests.status, "completed")
        )
      )
      .orderBy(desc(serviceRequests.completedAt));

    return NextResponse.json({ success: true, history });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
