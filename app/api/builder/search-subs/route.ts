import { db } from "@/lib/db";
import { subcontractors } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "@/lib/utils/builder-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const builder = await getAuthenticatedBuilder();
    if (!builder) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const trade = searchParams.get("trade");
    const area = searchParams.get("area");
    const verifiedOnly = searchParams.get("verified") === "true";
    const query = searchParams.get("q");

    const conditions = [eq(subcontractors.status, "active")];

    if (trade) {
      conditions.push(
        sql`${subcontractors.tradeCategories}::jsonb @> ${JSON.stringify([trade])}::jsonb`
      );
    }

    if (verifiedOnly) {
      conditions.push(eq(subcontractors.isVerified, true));
    }

    if (area) {
      conditions.push(
        sql`LOWER(${subcontractors.serviceArea}) LIKE ${"%" + area.toLowerCase() + "%"}`
      );
    }

    if (query) {
      conditions.push(
        sql`(LOWER(${subcontractors.companyName}) LIKE ${"%" + query.toLowerCase() + "%"} OR LOWER(${subcontractors.contactName}) LIKE ${"%" + query.toLowerCase() + "%"})`
      );
    }

    const results = await db
      .select({
        id: subcontractors.id,
        companyName: subcontractors.companyName,
        contactName: subcontractors.contactName,
        email: subcontractors.email,
        phone: subcontractors.phone,
        tradeCategories: subcontractors.tradeCategories,
        slug: subcontractors.slug,
        bio: subcontractors.bio,
        serviceArea: subcontractors.serviceArea,
        licenseNumber: subcontractors.licenseNumber,
        insuranceExpiresAt: subcontractors.insuranceExpiresAt,
        isVerified: subcontractors.isVerified,
        pricingRanges: subcontractors.pricingRanges,
      })
      .from(subcontractors)
      .where(and(...conditions))
      .orderBy(
        sql`${subcontractors.isVerified} DESC`,
        subcontractors.companyName
      );

    return NextResponse.json({ success: true, subcontractors: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
