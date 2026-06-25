import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
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
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Define protected and auth routes
  const isAuthRoute =
    path.startsWith("/login") ||
    path.startsWith("/register");

  const isProtectedRoute =
    path.startsWith("/pharmacy") ||
    path.startsWith("/courier") ||
    path.startsWith("/request") ||
    path.startsWith("/orders") ||
    path.startsWith("/profile") ||
    path.startsWith("/admin") ||
    path.startsWith("/superadmin");

  // Redirect unauthenticated users to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // If user is authenticated, retrieve role from DB and authorize paths
  if (user) {
    const [profileResult, staffResult] = await Promise.all([
      supabase.from("users").select("role").eq("id", user.id).single(),
      supabase.from("pharmacy_staff").select("staff_role").eq("user_id", user.id).eq("is_active", true).single(),
    ]);

    const role = profileResult.data?.role || "customer";
    const staffRole = staffResult.data?.staff_role || null;

    // Redirect authenticated users away from auth pages to their respective dashboard
    if (isAuthRoute) {
      let homePath = "/";
      if (role === "super_admin") {
        homePath = "/superadmin";
      } else if (staffRole === "admin" || staffRole === "owner") {
        homePath = "/admin";
      } else if (staffRole === "courier") {
        homePath = "/courier";
      }
      const url = request.nextUrl.clone();
      url.pathname = homePath;
      return NextResponse.redirect(url);
    }

    // Role-based route authorization
    if (role === "super_admin") {
      // Super Admin can ONLY access /superadmin pages
      if (!path.startsWith("/superadmin")) {
        const url = request.nextUrl.clone();
        url.pathname = "/superadmin";
        return NextResponse.redirect(url);
      }
    } else if (staffRole === "admin" || staffRole === "owner") {
      // Admin Apotek can ONLY access /admin pages
      if (!path.startsWith("/admin")) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
    } else if (staffRole === "courier") {
      // Courier can ONLY access /courier pages
      if (!path.startsWith("/courier")) {
        const url = request.nextUrl.clone();
        url.pathname = "/courier";
        return NextResponse.redirect(url);
      }
    } else {
      // Customer/regular user can ONLY access customer/user pages.
      // Customer routes are: /, /orders, /profile, /pharmacy, /request
      // If customer tries to access admin, superadmin, or courier routes, redirect to home /
      if (path.startsWith("/superadmin") || path.startsWith("/admin") || path.startsWith("/courier")) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
