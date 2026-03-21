import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { builderAccounts, homeownerAccounts, subcontractorAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type TenantContext =
  | { role: "builder"; builderId: string; userId: string }
  | { role: "homeowner"; builderId: string; homeId: string; homeownerId: string; userId: string }
  | { role: "subcontractor"; subcontractorId: string; userId: string };

/**
 * Get the tenant context for the current authenticated user.
 * This is the single source of truth for tenant scoping.
 * Returns null if unauthenticated.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check builder account first
    const [builderAccount] = await db
      .select()
      .from(builderAccounts)
      .where(eq(builderAccounts.supabaseUserId, user.id))
      .limit(1);

    if (builderAccount) {
      return { role: "builder", builderId: builderAccount.builderId, userId: user.id };
    }

    // Check homeowner account
    const [homeownerAccount] = await db
      .select()
      .from(homeownerAccounts)
      .where(eq(homeownerAccounts.supabaseUserId, user.id))
      .limit(1);

    if (homeownerAccount) {
      return {
        role: "homeowner",
        builderId: homeownerAccount.builderId,
        homeId: homeownerAccount.homeId,
        homeownerId: homeownerAccount.id,
        userId: user.id,
      };
    }

    // Check subcontractor account
    const [subAccount] = await db
      .select()
      .from(subcontractorAccounts)
      .where(eq(subcontractorAccounts.supabaseUserId, user.id))
      .limit(1);

    if (subAccount) {
      return { role: "subcontractor", subcontractorId: subAccount.subcontractorId, userId: user.id };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Require a specific role from the tenant context.
 * Returns the context if the role matches, null otherwise.
 */
export async function requireBuilder(): Promise<Extract<TenantContext, { role: "builder" }> | null> {
  const ctx = await getTenantContext();
  return ctx?.role === "builder" ? ctx : null;
}

export async function requireHomeowner(): Promise<Extract<TenantContext, { role: "homeowner" }> | null> {
  const ctx = await getTenantContext();
  return ctx?.role === "homeowner" ? ctx : null;
}
