import { db } from "@/lib/db";
import { subcontractorAccounts, subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subcontractorId, email } = body;

    if (!subcontractorId || !email) {
      return NextResponse.json(
        { success: false, error: "Missing subcontractorId or email" },
        { status: 400 }
      );
    }

    const [sub] = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, subcontractorId))
      .limit(1);

    if (!sub) {
      return NextResponse.json(
        { success: false, error: "Subcontractor not found" },
        { status: 404 }
      );
    }

    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users.users.find((u) => u.email === email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "No account found with that email. The subcontractor must sign up first at /sub/login" },
        { status: 404 }
      );
    }

    const [existing] = await db
      .select()
      .from(subcontractorAccounts)
      .where(eq(subcontractorAccounts.supabaseUserId, user.id))
      .limit(1);

    if (existing) {
      if (existing.subcontractorId === subcontractorId) {
        // Already linked to this exact sub — just confirm success
        return NextResponse.json({ success: true, message: "Already linked" });
      }
      return NextResponse.json(
        { success: false, error: "This email is already linked to a different subcontractor profile. The subcontractor should use a different email or contact support." },
        { status: 400 }
      );
    }

    // Check if there's a stale record by email (e.g. user re-signed up with new Supabase ID)
    const [existingByEmail] = await db
      .select()
      .from(subcontractorAccounts)
      .where(eq(subcontractorAccounts.email, email))
      .limit(1);

    if (existingByEmail) {
      // Update the stale supabase user ID
      await db
        .update(subcontractorAccounts)
        .set({ supabaseUserId: user.id })
        .where(eq(subcontractorAccounts.id, existingByEmail.id));
      return NextResponse.json({ success: true, message: "Account re-linked with updated credentials" });
    }

    await db.insert(subcontractorAccounts).values({
      supabaseUserId: user.id,
      subcontractorId,
      email,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}