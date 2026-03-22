import { db } from "@/lib/db";
import { serviceRequests, subcontractors } from "@/lib/db/schema";
import { eq, and, isNotNull, sql, avg, count, sum } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Avg cost by trade category
    const costByTrade = await db
      .select({
        tradeCategory: serviceRequests.tradeCategory,
        avgCost: avg(serviceRequests.jobCostCents),
        totalCost: sum(serviceRequests.jobCostCents),
        jobCount: count(),
      })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.builderId, builder.id),
          isNotNull(serviceRequests.jobCostCents)
        )
      )
      .groupBy(serviceRequests.tradeCategory)
      .orderBy(sql`avg(${serviceRequests.jobCostCents}) DESC`);

    // Avg cost by subcontractor
    const costBySub = await db
      .select({
        subcontractorId: serviceRequests.assignedSubcontractorId,
        companyName: subcontractors.companyName,
        contactName: subcontractors.contactName,
        avgCost: avg(serviceRequests.jobCostCents),
        totalCost: sum(serviceRequests.jobCostCents),
        jobCount: count(),
      })
      .from(serviceRequests)
      .innerJoin(
        subcontractors,
        eq(serviceRequests.assignedSubcontractorId, subcontractors.id)
      )
      .where(
        and(
          eq(serviceRequests.builderId, builder.id),
          isNotNull(serviceRequests.jobCostCents)
        )
      )
      .groupBy(
        serviceRequests.assignedSubcontractorId,
        subcontractors.companyName,
        subcontractors.contactName
      )
      .orderBy(sql`avg(${serviceRequests.jobCostCents}) DESC`);

    // Avg cost by sub per trade
    const costBySubAndTrade = await db
      .select({
        subcontractorId: serviceRequests.assignedSubcontractorId,
        companyName: subcontractors.companyName,
        tradeCategory: serviceRequests.tradeCategory,
        avgCost: avg(serviceRequests.jobCostCents),
        jobCount: count(),
      })
      .from(serviceRequests)
      .innerJoin(
        subcontractors,
        eq(serviceRequests.assignedSubcontractorId, subcontractors.id)
      )
      .where(
        and(
          eq(serviceRequests.builderId, builder.id),
          isNotNull(serviceRequests.jobCostCents)
        )
      )
      .groupBy(
        serviceRequests.assignedSubcontractorId,
        subcontractors.companyName,
        serviceRequests.tradeCategory
      )
      .orderBy(serviceRequests.tradeCategory, sql`avg(${serviceRequests.jobCostCents}) ASC`);

    // Overall totals
    const [totals] = await db
      .select({
        avgCost: avg(serviceRequests.jobCostCents),
        totalCost: sum(serviceRequests.jobCostCents),
        jobCount: count(),
      })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.builderId, builder.id),
          isNotNull(serviceRequests.jobCostCents)
        )
      );

    return NextResponse.json({
      success: true,
      totals: {
        avgCostCents: totals?.avgCost ? parseFloat(String(totals.avgCost)) : 0,
        totalCostCents: Number(totals?.totalCost ?? 0),
        jobCount: Number(totals?.jobCount ?? 0),
      },
      costByTrade: costByTrade.map((r) => ({
        tradeCategory: r.tradeCategory,
        avgCostCents: r.avgCost ? parseFloat(String(r.avgCost)) : 0,
        totalCostCents: Number(r.totalCost ?? 0),
        jobCount: Number(r.jobCount),
      })),
      costBySub: costBySub.map((r) => ({
        subcontractorId: r.subcontractorId,
        companyName: r.companyName,
        contactName: r.contactName,
        avgCostCents: r.avgCost ? parseFloat(String(r.avgCost)) : 0,
        totalCostCents: Number(r.totalCost ?? 0),
        jobCount: Number(r.jobCount),
      })),
      costBySubAndTrade: costBySubAndTrade.map((r) => ({
        subcontractorId: r.subcontractorId,
        companyName: r.companyName,
        tradeCategory: r.tradeCategory,
        avgCostCents: r.avgCost ? parseFloat(String(r.avgCost)) : 0,
        jobCount: Number(r.jobCount),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
