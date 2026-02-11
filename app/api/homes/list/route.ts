import { db } from "@/lib/db";
import { homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const TEST_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";

    const allHomes = await db
      .select({
        id: homes.id,
        address: homes.address,
        city: homes.city,
        state: homes.state,
      })
      .from(homes)
      .where(eq(homes.builderId, TEST_BUILDER_ID));

    return NextResponse.json({
      success: true,
      data: allHomes,
    });
  } catch (error: any) {
    console.error("Error listing homes:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
