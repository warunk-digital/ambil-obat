"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  User,
  Phone,
} from "lucide-react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Password dan Konfirmasi Password tidak cocok");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Check if email already registered in Supabase Auth via RPC helper
    const { data: emailExists, error: checkError } = await supabase
      .rpc("check_email_exists", { email_to_check: email.trim().toLowerCase() });

    if (checkError) {
      console.error("Error checking email availability:", checkError);
    } else if (emailExists) {
      setError("Email sudah terdaftar. Silakan gunakan email lain atau masuk.");
      setLoading(false);
      return;
    }
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Auto-redirect after 2 seconds
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 2000);
  };

  if (success) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-6">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold">Akun Berhasil Dibuat!</h2>
          <p className="text-sm text-muted-foreground">
            Selamat datang di Sobat. Anda akan dialihkan ke halaman utama...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <div className="flex flex-col items-center px-6 pt-10 pb-6">
        <div className="relative mb-4">
          <img
            src="/Logo Sobat BG Putih.png"
            alt="Sobat Logo"
            className="h-16 w-16 object-contain rounded-2xl shadow-lg shadow-black/10 border border-border/50 bg-white"
          />
        </div>
        <h1 className="gradient-text text-xl font-bold tracking-tight">
          Buat Akun Baru
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Daftar untuk mulai pesan antar obat
        </p>
      </div>

      {/* Register Form */}
      <div className="flex-1 px-6 pb-8">
        <div className="mx-auto max-w-sm">
          <div className="rounded-lg border border-border/60 bg-card p-6 shadow-xl shadow-black/5">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    required
                    autoComplete="name"
                    className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  No. Telepon
                </label>
                <div className="relative">
                  <Phone className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    required
                    autoComplete="tel"
                    className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
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
                  className="flex h-11 w-full rounded-md border border-input bg-background px-4 text-sm transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-4 pr-11 text-sm transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
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

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password Anda"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-4 pr-11 text-sm transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showConfirmPassword ? (
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
                className="h-11 w-full rounded-md text-sm font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {loading ? "Membuat akun..." : "Daftar"}
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center text-sm relative z-10">
            <span className="text-muted-foreground">Sudah punya akun?</span>{" "}
            <Link
              href="/login"
              className="inline-block p-2 -m-2 font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Masuk di sini
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
