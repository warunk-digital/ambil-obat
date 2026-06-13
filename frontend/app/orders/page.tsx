"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { formatRelativeTime, formatRupiah } from "@/lib/helpers";
import { STATUS_CONFIG } from "@/lib/types";
import type { DeliveryRequest, DeliveryStatus } from "@/lib/types";
import {
  ClipboardList,
  ChevronRight,
  Loader2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");

  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("delivery_requests")
        .select("*, pharmacy:pharmacies(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filter === "active") {
        query = query.not("status", "in", '("delivered","cancelled")');
      } else if (filter === "completed") {
        query = query.eq("status", "delivered");
      } else if (filter === "cancelled") {
        query = query.eq("status", "cancelled");
      }

      const { data } = await query;
      setRequests((data || []) as DeliveryRequest[]);
      setLoading(false);
    };

    fetchRequests();

    // Realtime subscription for status updates
    const supabase = createClient();
    const channel = supabase
      .channel("my-requests")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_requests",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setRequests((prev) =>
            prev.map((r) =>
              r.id === payload.new.id
                ? { ...r, ...(payload.new as Partial<DeliveryRequest>) }
                : r,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, filter]);

  const filterTabs = [
    { key: "active" as const, label: "Aktif" },
    { key: "completed" as const, label: "Selesai" },
    { key: "cancelled" as const, label: "Dibatalkan" },
    { key: "all" as const, label: "Semua" },
  ];

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <div className="bg-card px-6 pt-12 pb-4 shadow-sm">
        <h1 className="text-lg font-bold">Pesanan Saya</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Lacak status pengiriman obat Anda
        </p>

        {/* Filter Tabs */}
        <div className="mt-4 flex gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-medium transition-all",
                filter === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="px-6 py-4 pb-nav">
        {loading ? (
          <div className="flex flex-col items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Belum ada pesanan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filter === "active"
                ? "Anda tidak memiliki pesanan aktif saat ini"
                : "Riwayat pesanan Anda akan muncul di sini"}
            </p>
            <Link
              href="/"
              className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Pesan Antar Obat
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const statusInfo = STATUS_CONFIG[request.status as DeliveryStatus];
              return (
                <Link
                  key={request.id}
                  href={`/orders/${request.id}`}
                  className="group block rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-all hover:border-primary/20 hover:shadow-md touch-active"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">
                          {request.request_number}
                        </span>
                        <span
                          className={cn(
                            "status-badge rounded-full px-2 py-0.5 text-[10px] font-medium",
                            statusInfo?.color,
                          )}
                        >
                          {statusInfo?.icon} {statusInfo?.label}
                        </span>
                      </div>

                      {request.pharmacy && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {request.pharmacy.name}
                        </p>
                      )}

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span>No. Obat: {request.medicine_number}</span>
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-[11px]">
                        <span className="font-medium">
                          {formatRupiah(request.delivery_fee)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatRelativeTime(request.created_at)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
