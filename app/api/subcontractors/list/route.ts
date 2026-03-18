import { db } from "@/lib/db";
import { subcontractors, builderSubcontractorRelationships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

export async function GET() {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const builderId = builder.id;

    const allSubs = await db
      .select({
        id: subcontractors.id,
        companyName: subcontractors.companyName,
        contactName: subcontractors.contactName,
        tradeCategories: subcontractors.tradeCategories,
      })
      .from(subcontractors)
      .innerJoin(
        builderSubcontractorRelationships,
        eq(subcontractors.id, builderSubcontractorRelationships.subcontractorId)
      )
      .where(eq(builderSubcontractorRelationships.builderId, builderId));

    return NextResponse.json({ success: true, data: allSubs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
