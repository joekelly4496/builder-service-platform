import { db } from "@/lib/db";
import { subcontractorAccounts, subcontractors, serviceRequests, homes, builders, builderSubcontractorRelationships } from "@/lib/db/schema";
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

    // Find subcontractor account by supabase user ID
    let [account] = await db
      .select()
      .from(subcontractorAccounts)
      .where(eq(subcontractorAccounts.supabaseUserId, user.id))
      .limit(1);

    // Fallback: look up by email and auto-repair the stale supabase user ID
    if (!account && user.email) {
      const [accountByEmail] = await db
        .select()
        .from(subcontractorAccounts)
        .where(eq(subcontractorAccounts.email, user.email))
        .limit(1);

      if (accountByEmail) {
        // Update the stale supabase user ID to the current one
        await db
          .update(subcontractorAccounts)
          .set({ supabaseUserId: user.id })
          .where(eq(subcontractorAccounts.id, accountByEmail.id));
        account = { ...accountByEmail, supabaseUserId: user.id };
        console.log(`Auto-repaired subcontractor account ${accountByEmail.id}: updated supabaseUserId to ${user.id}`);
      }
    }

    if (!account) {
      return NextResponse.json({ success: false, error: "No subcontractor account found. Please contact your builder to link your account." }, { status: 404 });
    }

    // Get subcontractor details
    const [subcontractor] = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, account.subcontractorId))
      .limit(1);

    // Get all assigned service requests with builder info for multi-tenancy
    const requests = await db
      .select({
        request: serviceRequests,
        home: homes,
        builder: {
          id: builders.id,
          companyName: builders.companyName,
        },
      })
      .from(serviceRequests)
      .innerJoin(homes, eq(serviceRequests.homeId, homes.id))
      .innerJoin(builders, eq(serviceRequests.builderId, builders.id))
      .where(eq(serviceRequests.assignedSubcontractorId, account.subcontractorId));

    return NextResponse.json({ success: true, subcontractor, requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}