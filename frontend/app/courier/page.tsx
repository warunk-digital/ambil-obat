"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Package, MapPin, CheckCircle2, ChevronRight, LogOut, Clock, Truck } from "lucide-react";
import { formatRupiah, formatTime } from "@/lib/helpers";
import { STATUS_CONFIG } from "@/lib/types";
import type { DeliveryRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function CourierDashboard() {
  const { user, signOut } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("delivery_requests")
        .select("*, pharmacy:pharmacies(name), address:addresses(full_address)")
        .eq("courier_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setRequests(data as unknown as DeliveryRequest[]);
      }
      setLoading(false);
    };

    fetchRequests();

    // Subscribe to changes
    const channel = supabase
      .channel("courier_requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_requests",
          filter: `courier_id=eq.${user.id}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const activeStatuses = ["courier_assigned", "picked_up", "on_delivery"];
  const completedStatuses = ["delivered", "cancelled"];

  const activeRequests = requests.filter((r) => activeStatuses.includes(r.status));
  const completedRequests = requests.filter((r) => completedStatuses.includes(r.status));

  const displayRequests = activeTab === "active" ? activeRequests : completedRequests;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-card px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-primary">Tugas Kurir</h1>
          <p className="text-xs text-muted-foreground">Halo, {user?.full_name}</p>
        </div>
        <button 
          onClick={handleSignOut}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="flex rounded-xl bg-muted/50 p-1">
          <button
            onClick={() => setActiveTab("active")}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
              activeTab === "active"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Tugas Aktif
            {activeRequests.length > 0 && (
              <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {activeRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
              activeTab === "completed"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 px-4 pt-6 space-y-4">
        {loading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Memuat data...</p>
          </div>
        ) : displayRequests.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Tidak ada tugas</p>
              <p className="text-xs text-muted-foreground">
                {activeTab === "active" 
                  ? "Anda belum mendapat tugas pengantaran baru." 
                  : "Belum ada tugas yang diselesaikan."}
              </p>
            </div>
          </div>
        ) : (
          displayRequests.map((request) => (
            <Link
              key={request.id}
              href={`/courier/requests/${request.id}`}
              className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {request.request_number}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(request.created_at)}
                    </span>
                  </div>
                  <h3 className="font-semibold">{request.pharmacy?.name || "Apotek"}</h3>
                </div>
                <div
                  className={cn(
                    "flex items-center rounded-full px-2 py-1 text-[10px] font-medium",
                    STATUS_CONFIG[request.status]?.color,
                    STATUS_CONFIG[request.status]?.bg
                  )}
                >
                  {STATUS_CONFIG[request.status]?.label}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {request.address?.full_address || "Alamat tidak tersedia"}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <p className="text-xs font-medium">
                    Jarak: {request.distance_km?.toFixed(1) || "-"} km
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">Tagihan COD (Ongkir)</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500">
                    {formatRupiah(request.delivery_fee)}
                  </p>
                </div>
                <div className="flex h-8 items-center gap-1 rounded-lg bg-primary/5 pl-3 pr-2 text-xs font-medium text-primary">
                  Detail <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
