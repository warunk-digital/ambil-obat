"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Store,
  LogOut,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/pharmacies", label: "Manajemen Apotek", icon: Store },
  { href: "/superadmin/users", label: "Manajemen Pengguna", icon: Users },
];

export function SuperAdminNav() {
  const pathname = usePathname();
  const { signOut, profile } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border/60 bg-slate-900 text-slate-50 md:flex h-svh sticky top-0">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <span className="font-bold tracking-tight text-white">Super Admin</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="grid gap-1 px-4">
            {navItems.map((item) => {
              const isActive =
                item.href === "/superadmin"
                  ? pathname === "/superadmin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-rose-500/20 text-rose-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-50",
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-rose-400" : "")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800">
              <span className="text-xs font-medium text-slate-300">
                {profile?.full_name?.charAt(0).toUpperCase() || "S"}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-slate-200">{profile?.full_name}</p>
              <p className="truncate text-xs text-rose-400">Owner Platform</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900/95 pb-safe md:hidden backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/superadmin"
                ? pathname === "/superadmin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-all",
                  isActive
                    ? "text-rose-400"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", isActive && "scale-110")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
