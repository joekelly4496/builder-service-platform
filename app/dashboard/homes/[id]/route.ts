import { db } from "@/lib/db";
import { homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const [home] = await db
      .select({
        id: homes.id,
        address: homes.address,
        city: homes.city,
        state: homes.state,
      })
      .from(homes)
      .where(eq(homes.id, id))
      .limit(1);

    if (!home) {
      return NextResponse.json(
        { success: false, error: "Home not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: home });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}