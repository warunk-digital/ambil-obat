"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { formatRupiah, formatDate } from "@/lib/helpers";
import { STATUS_CONFIG } from "@/lib/types";
import { 
  Loader2,
  ChevronRight
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [pharmacyName, setPharmacyName] = useState("");
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    onDelivery: 0,
    delivered: 0,
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      setLoading(true);

      // 1. Get Pharmacy ID
      const { data: staffData } = await supabase
        .from("pharmacy_staff")
        .select("pharmacy_id, pharmacy:pharmacies(name)")
        .eq("user_id", user.id)
        .in("staff_role", ["admin", "owner"])
        .single();

      if (!staffData) return;
      setPharmacyName((staffData.pharmacy as any)?.name || "Apotek");

      // 2. Get today's stats
      const todayStr = new Date().toISOString().split('T')[0];
      
      const { data: reqs } = await supabase
        .from("delivery_requests")
        .select("id, status, request_number, created_at, delivery_fee")
        .eq("pharmacy_id", staffData.pharmacy_id)
        .gte("created_at", `${todayStr}T00:00:00Z`);

      if (reqs) {
        setStats({
          pending: reqs.filter(r => r.status === 'pending').length,
          confirmed: reqs.filter(r => ['confirmed', 'courier_assigned', 'picked_up'].includes(r.status)).length,
          onDelivery: reqs.filter(r => r.status === 'on_delivery').length,
          delivered: reqs.filter(r => r.status === 'delivered').length,
        });
      }

      // 3. Get recent requests
      const { data: recent } = await supabase
        .from("delivery_requests")
        .select("*, address:addresses(*)")
        .eq("pharmacy_id", staffData.pharmacy_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recent) setRecentRequests(recent);
      
      setLoading(false);
    };

    fetchDashboardData();
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">{pharmacyName} • {formatDate(new Date().toISOString())}</p>
      </div>

      {/* Cohesive Logistics Status Bar */}
      <div className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="mb-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Alur Pengiriman Hari Ini</h2>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          
          {/* Step 1 */}
          <div className="flex-1 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-200/50 bg-amber-50/50 text-amber-600 font-bold text-lg dark:bg-amber-500/10 dark:border-amber-500/20">
              {stats.pending}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Pesanan Baru</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">Menunggu konfirmasi apotek</p>
            </div>
          </div>

          <div className="hidden md:block h-8 w-px bg-border/60 shrink-0 mx-2" />

          {/* Step 2 */}
          <div className="flex-1 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200/50 bg-blue-50/50 text-blue-600 font-bold text-lg dark:bg-blue-500/10 dark:border-blue-500/20">
              {stats.confirmed}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Diproses</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">Obat disiapkan & staf ready</p>
            </div>
          </div>

          <div className="hidden md:block h-8 w-px bg-border/60 shrink-0 mx-2" />

          {/* Step 3 */}
          <div className="flex-1 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-200/50 bg-cyan-50/50 text-cyan-600 font-bold text-lg dark:bg-cyan-500/10 dark:border-cyan-500/20">
              {stats.onDelivery}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Diantar</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">Dalam perjalanan kurir</p>
            </div>
          </div>

          <div className="hidden md:block h-8 w-px bg-border/60 shrink-0 mx-2" />

          {/* Step 4 */}
          <div className="flex-1 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-200/50 bg-emerald-50/50 text-emerald-600 font-bold text-lg dark:bg-emerald-500/10 dark:border-emerald-500/20">
              {stats.delivered}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Selesai</p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">Telah sampai di tujuan</p>
            </div>
          </div>

        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Pesanan Terkini</h2>
        <Link href="/admin/requests" className="text-sm font-medium text-primary hover:underline">
          Lihat Semua
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
        {recentRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Belum ada pesanan hari ini.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4">No. Request</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">No. Obat</th>
                    <th className="p-4">Tujuan / Alamat</th>
                    <th className="p-4">Biaya</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {recentRequests.map((req) => {
                    const statusInfo = STATUS_CONFIG[req.status as import("@/lib/types").DeliveryStatus];
                    return (
                      <tr key={req.id} className="hover:bg-muted/40 transition-colors group">
                        <td className="p-4 font-semibold text-primary">
                          <Link href={`/admin/requests/${req.id}`}>
                            {req.request_number}
                          </Link>
                        </td>
                        <td className="p-4">
                          <span 
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border"
                            style={{
                              color: statusInfo?.textColor,
                              backgroundColor: statusInfo?.bgColor + '60', // semi-transparent
                              borderColor: statusInfo?.textColor + '30',
                            }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusInfo?.textColor }} />
                            {statusInfo?.label}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-mono text-muted-foreground">{req.medicine_number}</td>
                        <td className="p-4 text-xs max-w-xs truncate">
                          <span className="font-medium text-foreground block">{req.address?.label}</span>
                          <span className="text-muted-foreground truncate block">{req.address?.full_address}</span>
                        </td>
                        <td className="p-4">
                          <div className="text-xs">
                            <span className="font-semibold text-foreground">{formatRupiah(req.delivery_fee)}</span>
                            <span className="text-[10px] text-muted-foreground block uppercase font-mono">{req.payment_status}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <Link 
                            href={`/admin/requests/${req.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Native List View */}
            <div className="block md:hidden divide-y divide-border/50">
              {recentRequests.map((req) => {
                const statusInfo = STATUS_CONFIG[req.status as import("@/lib/types").DeliveryStatus];
                return (
                  <Link 
                    key={req.id} 
                    href={`/admin/requests/${req.id}`}
                    className="flex items-center justify-between p-4 transition-colors active:bg-muted/60"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary text-sm">{req.request_number}</span>
                        <span 
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border"
                          style={{
                            color: statusInfo?.textColor,
                            backgroundColor: statusInfo?.bgColor + '60',
                            borderColor: statusInfo?.textColor + '20',
                          }}
                        >
                          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: statusInfo?.textColor }} />
                          {statusInfo?.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        No. Obat: {req.medicine_number} • {req.address?.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{formatRupiah(req.delivery_fee)}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-mono">{req.payment_status}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
