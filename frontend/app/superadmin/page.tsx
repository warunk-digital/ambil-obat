"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, Store, ClipboardList } from "lucide-react";

export default function SuperAdminDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    users: 0,
    pharmacies: 0,
    requests: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      
      const [usersRes, pharmRes, reqRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("pharmacies").select("id", { count: "exact", head: true }),
        supabase.from("delivery_requests").select("id", { count: "exact", head: true }),
      ]);

      setMetrics({
        users: usersRes.count || 0,
        pharmacies: pharmRes.count || 0,
        requests: reqRes.count || 0
      });

      setLoading(false);
    };

    fetchMetrics();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Overview</h1>
        <p className="text-slate-500">Statistik keseluruhan platform Ambil Obat</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{metrics.users}</p>
          <p className="font-medium text-slate-500">Total Pengguna</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Store className="h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{metrics.pharmacies}</p>
          <p className="font-medium text-slate-500">Total Apotek</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ClipboardList className="h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{metrics.requests}</p>
          <p className="font-medium text-slate-500">Total Pesanan</p>
        </div>
      </div>
    </div>
  );
}
