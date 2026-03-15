import { db } from "@/lib/db";
import { subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getBuilderId } from "@/lib/utils/get-builder-id";

export async function GET() {
  try {
    const builderId = await getBuilderId();

    const allSubs = await db
      .select({
        id: subcontractors.id,
        companyName: subcontractors.companyName,
        contactName: subcontractors.contactName,
        tradeCategories: subcontractors.tradeCategories,
      })
      .from(subcontractors)
      .where(eq(subcontractors.builderId, builderId));

    return NextResponse.json({ success: true, data: allSubs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
