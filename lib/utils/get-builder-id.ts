import { getAuthenticatedBuilder } from "./builder-auth";

const DEMO_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";

/**
 * Get the current builder ID — from auth session or fallback to demo.
 */
export async function getBuilderId(): Promise<string> {
  const builder = await getAuthenticatedBuilder();
  return builder?.id ?? DEMO_BUILDER_ID;
}
