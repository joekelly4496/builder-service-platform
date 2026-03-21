import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth token if expired
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public builder routes that don't require authentication
  const publicBuilderPaths = ["/builder/login", "/builder/onboarding"];
  const isPublicBuilderPath = publicBuilderPaths.some((path) => pathname.startsWith(path));

  // Protected page routes that require authentication
  const protectedPagePaths = ["/dashboard", "/homeowner", "/builder"];
  const isProtectedPage = protectedPagePaths.some((path) => pathname.startsWith(path)) && !isPublicBuilderPath;

  if (isProtectedPage && !user) {
    const loginUrl = new URL("/builder/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protected API routes that require authentication (cookie-based)
  // Note: /api/requests/* uses bearer token auth handled inside the route
  const protectedApiPaths = ["/api/builder/", "/api/homeowner/"];
  const isProtectedApi = protectedApiPaths.some((path) => pathname.startsWith(path));

  if (isProtectedApi && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ==================== TENANT VALIDATION ====================
  // Defense-in-depth: validate JWT claims contain the expected tenant identity.
  // The custom_access_token_hook injects builder_id, homeowner_id, subcontractor_id,
  // and user_role into JWT claims. We check these here so that even if a route
  // forgets to validate, the middleware blocks cross-tenant access early.
  if (user && isProtectedApi) {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // Decode the JWT to read custom claims injected by the hook
      const token = session.access_token;
      const payload = decodeJwtPayload(token);

      const isBuilderRoute = pathname.startsWith("/api/builder/");
      const isHomeownerRoute = pathname.startsWith("/api/homeowner/");

      // Builder API routes require user_role=builder with a valid builder_id claim
      if (isBuilderRoute && payload) {
        if (payload.user_role !== "builder" || !payload.builder_id) {
          return NextResponse.json(
            { error: "Forbidden: not a builder account" },
            { status: 403 }
          );
        }
      }

      // Homeowner API routes require user_role=homeowner with a valid homeowner_id claim
      if (isHomeownerRoute && payload) {
        if (payload.user_role !== "homeowner" || !payload.homeowner_id) {
          return NextResponse.json(
            { error: "Forbidden: not a homeowner account" },
            { status: 403 }
          );
        }
      }
    }
  }

  return supabaseResponse;
}

/**
 * Decode a JWT payload without verification (the token is already verified
 * by Supabase auth — we just need to read the custom claims).
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
