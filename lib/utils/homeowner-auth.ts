import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { homeownerAccounts, homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the authenticated homeowner account from the current session.
 * If no homeowner account exists but the user's email matches a home's
 * homeownerEmail, automatically creates the link.
 * Returns null if not authenticated or no matching home found.
 */
export async function getAuthenticatedHomeowner() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return null;

    // Check for existing linked account
    const [existingAccount] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.supabaseUserId, user.id))
      .limit(1);

    if (existingAccount) {
      const [home] = await db
        .select()
        .from(homes)
        .where(eq(homes.id, existingAccount.homeId))
        .limit(1);

      if (!home) return null;
      return { account: existingAccount, home };
    }

    // No linked account — try to auto-link by matching email to a home
    const [matchingHome] = await db
      .select()
      .from(homes)
      .where(eq(homes.homeownerEmail, user.email))
      .limit(1);

    if (!matchingHome) return null;

    // Auto-create the homeowner account link
    const [newAccount] = await db
      .insert(homeownerAccounts)
      .values({
        builderId: matchingHome.builderId,
        supabaseUserId: user.id,
        homeId: matchingHome.id,
        email: user.email,
      })
      .returning();

    return { account: newAccount, home: matchingHome };
  } catch {
    return null;
  }
}
