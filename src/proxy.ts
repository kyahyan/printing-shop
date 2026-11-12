import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getSupabasePublicKey,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { sanitizeSafeNextPath } from "@/lib/security";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const key = getSupabasePublicKey();
  if (!isSupabaseConfigured() || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
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

  const { pathname } = request.nextUrl;

  const isEmployeeRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isStaffLoginRoute = pathname === "/staff/login";

  const redirectWithCookies = (targetPath: string) => {
    const safeTarget = sanitizeSafeNextPath(targetPath, "/");
    const url = request.nextUrl.clone();
    const [destPathname, query] = safeTarget.split("?");
    url.pathname = destPathname;
    url.search = query ? `?${query}` : "";
    const redirectRes = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie);
    });
    return redirectRes;
  };

  if (isEmployeeRoute || isAdminRoute || isStaffLoginRoute) {
    // Authoritative server-side user verification for protected staff routes
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isEmployeeRoute || isAdminRoute) {
      if (!user) {
        return redirectWithCookies(
          `/staff/login?next=${encodeURIComponent(pathname)}`
        );
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .maybeSingle();

      // Fail closed if profile row is missing or deactivated
      if (!profile || !profile.is_active) {
        return redirectWithCookies("/staff/login?error=account_disabled");
      }

      if (isAdminRoute && profile.role !== "super_admin") {
        return redirectWithCookies(
          profile.role === "employee"
            ? "/dashboard?error=super_admin_required"
            : "/account?error=unauthorized"
        );
      }

      if (
        isEmployeeRoute &&
        profile.role !== "employee" &&
        profile.role !== "super_admin"
      ) {
        return redirectWithCookies("/account?error=staff_only");
      }
    }

    if (isStaffLoginRoute && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_active) {
        if (profile.role === "super_admin") {
          return redirectWithCookies("/admin");
        }
        if (profile.role === "employee") {
          return redirectWithCookies("/dashboard");
        }
      }
    }
  } else {
    // Refresh session cookies on public/customer routes without extra DB round-trip
    await supabase.auth.getClaims();
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
