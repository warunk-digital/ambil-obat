"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { formatRupiah, formatDate } from "@/lib/helpers";
import { STATUS_CONFIG } from "@/lib/types";
import { 
  ClipboardList, 
  Package, 
  Truck, 
  CheckCircle2, 
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

  const statCards = [
    { label: "Pesanan Baru", value: stats.pending, icon: ClipboardList, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "Diproses", value: stats.confirmed, icon: Package, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "Diantar", value: stats.onDelivery, icon: Truck, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
    { label: "Selesai", value: stats.delivered, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">{pharmacyName} • {formatDate(new Date().toISOString())}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((stat, i) => (
          <div key={i} className={`rounded-2xl border p-5 ${stat.color}`}>
            <stat.icon className="mb-3 h-6 w-6 opacity-80" />
            <p className="text-2xl font-bold leading-none">{stat.value}</p>
            <p className="mt-1 text-xs font-medium opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Pesanan Terkini</h2>
        <Link href="/admin/requests" className="text-sm font-medium text-primary hover:underline">
          Lihat Semua
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        {recentRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Belum ada pesanan hari ini.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {recentRequests.map((req) => (
              <Link 
                key={req.id} 
                href={`/admin/requests/${req.id}`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50 touch-active"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{req.request_number}</span>
                    {(() => {
                      const statusInfo = STATUS_CONFIG[req.status as import("@/lib/types").DeliveryStatus];
                      return (
                        <span 
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider"
                          style={{
                            color: statusInfo?.textColor,
                            backgroundColor: statusInfo?.bgColor,
                          }}
                        >
                          {statusInfo?.icon} {statusInfo?.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No. Obat: {req.medicine_number} • {req.address?.label}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold">{formatRupiah(req.delivery_fee)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{req.payment_status}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
