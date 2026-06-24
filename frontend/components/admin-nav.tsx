"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Settings,
  Store,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/requests", label: "Pesanan Masuk", icon: ClipboardList, badge: true },
  { href: "/admin/couriers", label: "Kurir", icon: Users },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const { signOut, profile, user } = useAuth();
  const router = useRouter();
  const [hasPendingOrders, setHasPendingOrders] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const checkPendingOrders = async () => {
      // First get pharmacy ID
      const { data: staffData } = await supabase
        .from("pharmacy_staff")
        .select("pharmacy_id")
        .eq("user_id", user.id)
        .in("staff_role", ["admin", "owner"])
        .single();

      if (!staffData) return;

      const { count } = await supabase
        .from("delivery_requests")
        .select("*", { count: "exact", head: true })
        .eq("pharmacy_id", staffData.pharmacy_id)
        .eq("status", "pending");
      
      setHasPendingOrders((count || 0) > 0);
    };

    checkPendingOrders();

    const channel = supabase
      .channel("pending_orders_admin_nav")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_requests" },
        () => checkPendingOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border/60 bg-card md:flex h-svh sticky top-0">
        <div className="flex h-16 items-center gap-2 border-b border-border/60 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold tracking-tight">Admin Apotek</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="grid gap-1 px-4">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <div className="relative">
                    <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "")} />
                    {item.badge && hasPendingOrders && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </div>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border/60 p-4">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <span className="text-xs font-medium">
                {profile?.full_name?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{profile?.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-xl pb-safe md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
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
