"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Loader2, Users, Truck, Phone, ShieldCheck } from "lucide-react";

export default function AdminCouriersPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchCouriers = async () => {
      setLoading(true);

      const { data: adminData } = await supabase
        .from("pharmacy_staff")
        .select("pharmacy_id")
        .eq("user_id", user.id)
        .in("staff_role", ["admin", "owner"])
        .single();

      if (adminData) {
        const { data } = await supabase
          .from("pharmacy_staff")
          .select("*, user:users(*)")
          .eq("pharmacy_id", adminData.pharmacy_id);
          
        if (data) setStaff(data);
      }
      
      setLoading(false);
    };

    fetchCouriers();
  }, [user, supabase]);

  const couriers = staff.filter(s => s.staff_role === "courier");
  const admins = staff.filter(s => s.staff_role !== "courier");

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Staf & Kurir</h1>
        <p className="text-sm text-muted-foreground">Daftar staf internal apotek Anda</p>
      </div>

      <div className="mb-4 mt-8 flex items-center gap-2">
        <Truck className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold">Kurir Internal ({couriers.length})</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {couriers.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Belum ada kurir terdaftar.
          </div>
        ) : (
          couriers.map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <span className="text-lg font-bold text-indigo-600">
                  {c.user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-semibold">{c.user.full_name}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {c.user.phone || "-"}
                </div>
              </div>
              <div className={`h-3 w-3 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} title={c.is_active ? 'Aktif' : 'Non-aktif'} />
            </div>
          ))
        )}
      </div>

      <div className="mb-4 mt-12 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold">Admin Apotek ({admins.length})</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {admins.map((a) => (
          <div key={a.id} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <span className="text-lg font-bold text-emerald-600">
                {a.user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-semibold">{a.user.full_name}</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <span className="uppercase text-emerald-600">{a.staff_role}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
