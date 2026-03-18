import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { homeownerAccounts, homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the authenticated homeowner account from the current session.
 * Returns null if not authenticated or no homeowner account exists.
 */
export async function getAuthenticatedHomeowner() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const [account] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.supabaseUserId, user.id))
      .limit(1);

    if (!account) return null;

    const [home] = await db
      .select()
      .from(homes)
      .where(eq(homes.id, account.homeId))
      .limit(1);

    if (!home) return null;

    return { account, home };
  } catch {
    return null;
  }
}
