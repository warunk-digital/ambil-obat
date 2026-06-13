"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Truck,
} from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email atau password salah"
          : authError.message,
      );
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .single();
        
      if (profile?.role === "super_admin") {
        router.push("/superadmin");
        router.refresh();
        return;
      }

      // Check if user is pharmacy staff (admin/owner or courier)
      const { data: staff } = await supabase
        .from("pharmacy_staff")
        .select("staff_role")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .single();

      if (staff) {
        if (staff.staff_role === "admin" || staff.staff_role === "owner") {
          router.push("/admin");
          router.refresh();
          return;
        } else if (staff.staff_role === "courier") {
          router.push("/courier");
          router.refresh();
          return;
        }
      }
    }

    // Normal customer/user falls through here. 
    // If redirect points to admin/superadmin, override it to "/" to avoid access denied.
    const safeRedirect = 
      redirect.startsWith("/admin") || redirect.startsWith("/superadmin")
        ? "/"
        : redirect;

    router.push(safeRedirect);
    router.refresh();
  };

  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header Illustration */}
      <div className="flex flex-col items-center px-6 pt-12 pb-8">
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
            <Pill className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="absolute -right-2 -bottom-2 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary shadow-md">
            <Truck className="h-5 w-5 text-primary" />
          </div>
        </div>
        <h1 className="gradient-text text-2xl font-bold tracking-tight">
          Ambil Obat
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Antar obat dari apotek ke rumah Anda
        </p>
      </div>

      {/* Login Form */}
      <div className="flex-1 px-6">
        <div className="mx-auto max-w-sm">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xl shadow-black/5">
            <h2 className="mb-1 text-lg font-semibold">Masuk</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Masukkan email dan password Anda
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  autoComplete="email"
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 pr-11 text-sm transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full rounded-xl text-sm font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {loading ? "Memproses..." : "Masuk"}
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center text-sm relative z-10">
            <span className="text-muted-foreground">Belum punya akun?</span>{" "}
            <Link
              href="/register"
              className="inline-block p-2 -m-2 font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Daftar sekarang
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom safe area spacer */}
      <div className="h-8" />
    </div>
  );
}
