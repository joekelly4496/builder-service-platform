import { db } from "@/lib/db";
import { homeownerAccounts, homes } from "@/lib/db/schema";
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
    const { homeId, email } = body;

    if (!homeId || !email) {
      return NextResponse.json(
        { success: false, error: "Missing homeId or email" },
        { status: 400 }
      );
    }

    // Verify home exists
    const [home] = await db
      .select()
      .from(homes)
      .where(eq(homes.id, homeId))
      .limit(1);

    if (!home) {
      return NextResponse.json(
        { success: false, error: "Home not found" },
        { status: 404 }
      );
    }

    // Look up the Supabase user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) throw userError;

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "No account found with that email. The homeowner must sign up first at /homeowner/login" },
        { status: 404 }
      );
    }

    // Check if already linked
    const [existing] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.supabaseUserId, user.id))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "This account is already linked to a home" },
        { status: 400 }
      );
    }

    // Link account to home
    await db.insert(homeownerAccounts).values({
      builderId: home.builderId,
      supabaseUserId: user.id,
      homeId,
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
