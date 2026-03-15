import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { builderAccounts, builders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the authenticated builder from the current session.
 * Returns null if not authenticated or no builder account exists.
 */
export async function getAuthenticatedBuilder() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const [account] = await db
      .select()
      .from(builderAccounts)
      .where(eq(builderAccounts.supabaseUserId, user.id))
      .limit(1);

    if (!account) return null;

    const [builder] = await db
      .select()
      .from(builders)
      .where(eq(builders.id, account.builderId))
      .limit(1);

    if (!builder) return null;

    return builder;
  } catch {
    return null;
  }
}
