import { db } from "@/lib/db";
import { subcontractorAccounts, subcontractors, serviceRequests, homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [account] = await db
      .select()
      .from(subcontractorAccounts)
      .where(eq(subcontractorAccounts.supabaseUserId, user.id))
      .limit(1);

    if (!account) {
      return NextResponse.json({ success: false, error: "No subcontractor account found" }, { status: 404 });
    }

    const [subcontractor] = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, account.subcontractorId))
      .limit(1);

    const results = await db
      .select({ request: serviceRequests, home: homes })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .where(eq(serviceRequests.id, id))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    const { request: req, home } = results[0];

    if (req.assignedSubcontractorId !== account.subcontractorId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true, request: req, home, subcontractor });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
