"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import {
  User,
  MapPin,
  LogOut,
  ChevronRight,
  Phone,
  Mail,
  Shield,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    {
      icon: MapPin,
      label: "Alamat Tersimpan",
      href: "/profile/addresses",
      desc: "Kelola alamat pengiriman Anda",
    },
  ];

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-6 pb-6 pt-12">
        <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-6 translate-y-6 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <User className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">
              {profile?.full_name || "Pengguna"}
            </h1>
            {profile?.phone && (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-primary-foreground/70">
                <Phone className="h-3 w-3" />
                {profile.phone}
              </div>
            )}
            {user?.email && (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-primary-foreground/70">
                <Mail className="h-3 w-3" />
                {user.email}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-6 py-6 pb-nav space-y-3">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md touch-active"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
          </Link>
        ))}

        {/* App Info */}
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <img
              src="/Logo Sobat BG Putih.png"
              alt="Sobat Logo"
              className="h-10 w-10 object-contain rounded-xl shadow-sm border border-border/50 bg-white"
            />
            <div>
              <p className="text-sm font-medium">Sobat</p>
              <p className="text-[11px] text-muted-foreground">Versi 2.1.0</p>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="flex items-center gap-3 rounded-xl bg-primary/5 px-4 py-3">
          <Shield className="h-4 w-4 text-primary" />
          <p className="text-[11px] text-muted-foreground">
            Data Anda aman dan terenkripsi
          </p>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 transition-all hover:bg-destructive/10 touch-active"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <LogOut className="h-5 w-5 text-destructive" />
          </div>
          <span className="text-sm font-medium text-destructive">Keluar</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
