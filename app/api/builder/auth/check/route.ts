import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { builderAccounts, builders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check if builder account exists
    const [account] = await db
      .select()
      .from(builderAccounts)
      .where(eq(builderAccounts.supabaseUserId, user.id))
      .limit(1);

    if (!account) {
      return NextResponse.json({ hasAccount: false });
    }

    // Get builder details for onboarding status
    const [builder] = await db
      .select()
      .from(builders)
      .where(eq(builders.id, account.builderId))
      .limit(1);

    return NextResponse.json({
      hasAccount: true,
      builderId: account.builderId,
      onboardingStatus: builder?.onboardingStatus || "company_info",
    });
  } catch (error: any) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
