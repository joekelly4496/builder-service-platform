import { db } from "@/lib/db";
import { homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getBuilderId } from "@/lib/utils/get-builder-id";

export async function GET() {
  try {
    const builderId = await getBuilderId();

    const allHomes = await db
      .select({
        id: homes.id,
        address: homes.address,
        city: homes.city,
        state: homes.state,
      })
      .from(homes)
      .where(eq(homes.builderId, builderId));

    return NextResponse.json({
      success: true,
      data: allHomes,
    });
  } catch (error: any) {
    console.error("Error listing homes:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
