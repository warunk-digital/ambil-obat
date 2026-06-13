"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  {
    href: "/",
    label: "Beranda",
    icon: Home,
  },
  {
    href: "/orders",
    label: "Pesanan",
    icon: ClipboardList,
    badge: true,
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hasActiveOrders, setHasActiveOrders] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const checkActiveOrders = async () => {
      const { count } = await supabase
        .from("delivery_requests")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("status", "in", '("delivered","cancelled")');
      
      setHasActiveOrders((count || 0) > 0);
    };

    checkActiveOrders();

    const channel = supabase
      .channel("active_orders_nav")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_requests", filter: `user_id=eq.${user.id}` },
        () => checkActiveOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-xl pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="relative">
                {isActive && (
                  <div className="absolute -inset-2 rounded-xl bg-primary/10" />
                )}
                <item.icon
                  className={cn(
                    "relative h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110",
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.badge && hasActiveOrders && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive shadow-sm ring-2 ring-card" />
                )}
              </div>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
