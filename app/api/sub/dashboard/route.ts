import { db } from "@/lib/db";
import { subcontractorAccounts, subcontractors, serviceRequests, homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Find subcontractor account
    const [account] = await db
      .select()
      .from(subcontractorAccounts)
      .where(eq(subcontractorAccounts.supabaseUserId, user.id))
      .limit(1);

    if (!account) {
      return NextResponse.json({ success: false, error: "No subcontractor account found. Please contact your builder to link your account." }, { status: 404 });
    }

    // Get subcontractor details
    const [subcontractor] = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, account.subcontractorId))
      .limit(1);

    // Get all assigned service requests
    const requests = await db
      .select({
        request: serviceRequests,
        home: homes,
      })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .where(eq(serviceRequests.assignedSubcontractorId, account.subcontractorId));

    return NextResponse.json({ success: true, subcontractor, requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}