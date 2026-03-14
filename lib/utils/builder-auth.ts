import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { builderAccounts, builders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the authenticated builder from the current session.
 * Returns null if not authenticated or no builder account exists.
 */
export async function getAuthenticatedBuilder() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in Server Components
            }
          },
        },
      }
    );

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
