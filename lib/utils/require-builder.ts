import { NextResponse } from "next/server";
import { getAuthenticatedBuilder } from "./builder-auth";

/**
 * Require an authenticated builder for an API route.
 * Returns the builder record or a 401 JSON response.
 *
 * Usage:
 *   const result = await requireBuilder();
 *   if (result instanceof NextResponse) return result;
 *   const builder = result;
 */
export async function requireBuilder() {
  const builder = await getAuthenticatedBuilder();
  if (!builder) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return builder;
}
