"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const DEMO_BUILDER_ID = "75c73c79-029b-44a0-a9e3-4d6366ac141d";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Client-side hook to get the current builder ID.
 * Tries authenticated user first, falls back to demo ID.
 */
export function useBuilderId() {
  const [builderId, setBuilderId] = useState<string>(DEMO_BUILDER_ID);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolve() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch("/api/builder/auth/check", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const result = await res.json();
          if (result.hasAccount) {
            setBuilderId(result.builderId);
          }
        }
      } catch {
        // Fall back to demo
      }
      setLoading(false);
    }
    resolve();
  }, []);

  return { builderId, loading };
}
