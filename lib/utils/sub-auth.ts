import { db } from "@/lib/db";
import { subcontractorAccounts, subcontractors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get the authenticated subcontractor from the Authorization header.
 * Returns null if not authenticated or no subcontractor account exists.
 */
export async function getAuthenticatedSubcontractor(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return null;

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return null;

    const [account] = await db
      .select()
      .from(subcontractorAccounts)
      .where(eq(subcontractorAccounts.supabaseUserId, user.id))
      .limit(1);

    if (!account) return null;

    const [sub] = await db
      .select()
      .from(subcontractors)
      .where(eq(subcontractors.id, account.subcontractorId))
      .limit(1);

    if (!sub) return null;

    return { account, subcontractor: sub };
  } catch {
    return null;
  }
}
