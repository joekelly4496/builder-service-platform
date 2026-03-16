"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Client-side hook to get the current builder ID.
 * Uses SSR-compatible Supabase client that stores session in cookies.
 */
export function useBuilderId() {
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolve() {
      try {
        const supabase = createSupabaseBrowserClient();
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
        // No authenticated builder
      }
      setLoading(false);
    }
    resolve();
  }, []);

  return { builderId, loading };
}
