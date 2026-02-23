import { db } from "@/lib/db";
import { subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const TEST_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";

    const allSubs = await db
      .select({
        id: subcontractors.id,
        companyName: subcontractors.companyName,
        contactName: subcontractors.contactName,
        tradeCategories: subcontractors.tradeCategories,
      })
      .from(subcontractors)
      .where(eq(subcontractors.builderId, TEST_BUILDER_ID));

    return NextResponse.json({ success: true, data: allSubs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
