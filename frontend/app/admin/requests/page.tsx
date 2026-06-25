"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { formatDate, formatTime } from "@/lib/helpers";
import { STATUS_CONFIG } from "@/lib/types";
import type { DeliveryRequest, DeliveryStatus } from "@/lib/types";
import { Loader2, Search, ChevronRight, Package, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminRequestsPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "cancelled">("active");

  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      setLoading(true);

      const { data: staffData } = await supabase
        .from("pharmacy_staff")
        .select("pharmacy_id")
        .eq("user_id", user.id)
        .in("staff_role", ["admin", "owner"])
        .single();

      if (!staffData) return;

      let query = supabase
        .from("delivery_requests")
        .select("*, address:addresses(*), customer:users!delivery_requests_user_id_fkey(*)")
        .eq("pharmacy_id", staffData.pharmacy_id)
        .order("created_at", { ascending: false });

      if (statusFilter === "active") {
        query = query.not("status", "in", '("delivered","cancelled")');
      } else if (statusFilter === "cancelled") {
        query = query.eq("status", "cancelled");
      }

      const { data } = await query;
      if (data) setRequests(data as unknown as DeliveryRequest[]);
      
      setLoading(false);
    };

    fetchRequests();

    // Supabase realtime subscription
    const channel = supabase
      .channel('admin_requests_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_requests' },
        () => fetchRequests() // For simplicity on MVP, just refetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, statusFilter, supabase]);

  const filteredRequests = requests.filter(
    (req) => 
      req.request_number.toLowerCase().includes(search.toLowerCase()) ||
      (req.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (req.customer?.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pesanan Masuk</h1>
          <p className="text-sm text-muted-foreground">Kelola permintaan antar obat</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari No. Request / Obat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "active" | "all" | "cancelled")}
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="active">Status Aktif</option>
            <option value="cancelled">Dibatalkan</option>
            <option value="all">Semua Status</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-border/60 bg-white/70 backdrop-blur-xl shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Tidak ada pesanan ditemukan</p>
            <p className="text-xs text-muted-foreground">Coba ubah filter atau pencarian Anda.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50 p-2 sm:p-0 sm:divide-y-0 sm:gap-2 sm:flex sm:flex-col sm:p-3">
            {filteredRequests.map((req) => {
              const statusInfo = STATUS_CONFIG[req.status as DeliveryStatus];
              
              return (
                <Link
                  key={req.id}
                  href={`/admin/requests/${req.id}`}
                  className="group flex flex-col gap-4 p-4 mb-2 sm:mb-0 rounded-lg sm:rounded-md bg-card/50 transition-all hover:bg-card hover:shadow-md sm:flex-row sm:items-center sm:justify-between border border-transparent hover:border-border/60"
                >
                  <div className="flex flex-1 items-start gap-4">
                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 shadow-inner sm:flex">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-primary text-base sm:text-sm">{req.request_number}</span>
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase"
                          style={{
                            color: statusInfo.textColor,
                            backgroundColor: statusInfo.bgColor,
                          }}
                        >
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="flex items-center">Pasien: <span className="ml-1 font-medium text-foreground/80">{req.patient_name || req.customer?.full_name}</span></span>
                        {req.doctor_name && (
                          <span className="flex items-center">Dokter: <span className="ml-1 font-medium text-foreground/80">{req.doctor_name}</span></span>
                        )}
                        <span className="flex items-center">{formatDate(req.created_at)} {formatTime(req.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-3 mt-1 sm:mt-0 sm:border-0 sm:pt-0">
                    <span className="text-xs font-semibold text-primary/80 group-hover:text-primary transition-colors">Lihat Detail</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors">
                      <ChevronRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
