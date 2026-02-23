import { db } from "@/lib/db";
import { homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const [home] = await db
      .select({
        id: homes.id,
        address: homes.address,
        city: homes.city,
        state: homes.state,
      })
      .from(homes)
      .where(eq(homes.id, params.id));

    if (!home) {
      return NextResponse.json({ success: false, error: "Home not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: home });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
