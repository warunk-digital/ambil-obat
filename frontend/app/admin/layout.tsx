"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { AdminNav } from "@/components/admin-nav";
import { Loader2, AlertCircle, LogOut, Store } from "lucide-react";
import type { PharmacyStaff, Pharmacy } from "@/lib/types";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login?redirect=/admin");
      return;
    }

    const checkAdminAccess = async () => {
      setIsChecking(true);
      const { data, error: staffError } = await supabase
        .from("pharmacy_staff")
        .select("*, pharmacy:pharmacies(*)")
        .eq("user_id", user.id)
        .in("staff_role", ["admin", "owner"])
        .eq("is_active", true)
        .single();

      if (staffError || !data) {
        setHasAccess(false);
        setError("Anda tidak memiliki akses admin apotek.");
      } else {
        setHasAccess(true);
      }
      setIsChecking(false);
    };

    checkAdminAccess();
  }, [user, authLoading, router, supabase]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (authLoading || isChecking) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-lg font-bold">Akses Ditolak</h2>
        <p className="mb-6 text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row bg-background md:bg-muted/30">
      {/* Mobile Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-border/60 bg-card/95 backdrop-blur-xl px-6 sticky top-0 z-40 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Store className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="font-bold text-sm tracking-tight">Admin Apotek</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          title="Keluar"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </header>

      <AdminNav />
      <main className="flex-1 pb-nav md:pb-0">
        {/* Konten tiap halaman admin akan berada di sini */}
        <div className="min-h-[calc(105vh-3.5rem)] md:min-h-svh bg-background md:rounded-tl-2xl md:border-t md:border-l md:border-border/60 md:shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
