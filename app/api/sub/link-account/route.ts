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
      return NextResponse.json(
        { success: false, error: "This account is already linked to a subcontractor" },
        { status: 400 }
      );
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