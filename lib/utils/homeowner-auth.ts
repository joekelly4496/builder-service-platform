import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { homeownerAccounts, homes } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Get the authenticated homeowner account from the current session.
 * If no homeowner account exists but the user's email matches a home's
 * homeownerEmail, automatically creates the link.
 * Returns null if not authenticated or no matching home found.
 */
export async function getAuthenticatedHomeowner() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("Homeowner auth: failed to get user", authError.message);
    return null;
  }
  if (!user || !user.email) {
    console.error("Homeowner auth: no user or no email");
    return null;
  }

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

    if (!home) {
      console.error("Homeowner auth: account exists but home not found", existingAccount.homeId);
      return null;
    }
    return { account: existingAccount, home };
  }

  // No linked account — try to auto-link by matching email to a home (case-insensitive)
  const userEmail = user.email.toLowerCase();
  const [matchingHome] = await db
    .select()
    .from(homes)
    .where(sql`lower(${homes.homeownerEmail}) = ${userEmail}`)
    .limit(1);

  if (!matchingHome) {
    console.error("Homeowner auth: no home found for email", userEmail);
    return null;
  }

  // Auto-create the homeowner account link
  try {
    const [newAccount] = await db
      .insert(homeownerAccounts)
      .values({
        builderId: matchingHome.builderId,
        supabaseUserId: user.id,
        homeId: matchingHome.id,
        email: user.email,
      })
      .returning();

    console.log("Homeowner auth: auto-linked account for", userEmail, "to home", matchingHome.id);
    return { account: newAccount, home: matchingHome };
  } catch (insertError: any) {
    console.error("Homeowner auth: failed to auto-link account", insertError.message);
    return null;
  }
}
