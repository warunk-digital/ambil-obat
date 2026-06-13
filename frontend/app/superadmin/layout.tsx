"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SuperAdminNav } from "@/components/superadmin-nav";
import { Loader2, ShieldAlert, LogOut } from "lucide-react";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login?redirect=/superadmin");
      return;
    }

    // Role check from users table (via profile in auth provider)
    if (profile && profile.role !== "super_admin") {
      setIsChecking(false);
    } else if (profile?.role === "super_admin") {
      setIsChecking(false);
    }
  }, [user, profile, authLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (authLoading || (isChecking && !profile)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (profile?.role !== "super_admin") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-50">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20">
          <ShieldAlert className="h-8 w-8 text-rose-500" />
        </div>
        <h2 className="mb-2 text-lg font-bold">Akses Sangat Terbatas</h2>
        <p className="mb-6 text-sm text-slate-400">Anda tidak memiliki kredensial super admin.</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row bg-slate-50 md:bg-slate-200/50 text-slate-900">
      {/* Mobile Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-xl px-6 sticky top-0 z-40 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
            <ShieldAlert className="h-4.5 w-4.5 text-rose-600" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900">Super Admin</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-500/10 transition-colors"
          title="Keluar"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </header>

      <SuperAdminNav />
      <main className="flex-1 pb-nav md:pb-0">
        <div className="min-h-[calc(105vh-3.5rem)] md:min-h-svh bg-slate-50 md:rounded-tl-2xl md:border-t md:border-l md:border-slate-300 md:shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
