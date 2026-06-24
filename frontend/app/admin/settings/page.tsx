"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Loader2, Save, Store, MapPin, Banknote, AlertCircle, Clock } from "lucide-react";
import type { Pharmacy } from "@/lib/types";

const DAY_LABELS: Record<string, string> = {
  mon: "Senin",
  tue: "Selasa",
  wed: "Rabu",
  thu: "Kamis",
  fri: "Jumat",
  sat: "Sabtu",
  sun: "Minggu"
};

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!user) return;

    const fetchPharmacy = async () => {
      setLoading(true);

      const { data: staffData } = await supabase
        .from("pharmacy_staff")
        .select("pharmacy_id")
        .eq("user_id", user.id)
        .in("staff_role", ["admin", "owner"])
        .single();

      if (staffData) {
        const { data } = await supabase
          .from("pharmacies")
          .select("*")
          .eq("id", staffData.pharmacy_id)
          .single();
          
        if (data) setPharmacy(data as Pharmacy);
      }
      
      setLoading(false);
    };

    fetchPharmacy();
  }, [user, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacy) return;

    setSaving(true);
    setMessage({ type: "", text: "" });

    const { error } = await supabase
      .from("pharmacies")
      .update({
        name: pharmacy.name,
        delivery_radius_km: pharmacy.delivery_radius_km,
        delivery_fee_base: pharmacy.delivery_fee_base,
        delivery_fee_base_km: pharmacy.delivery_fee_base_km,
        delivery_fee_per_km: pharmacy.delivery_fee_per_km,
        is_active: pharmacy.is_active,
        operating_hours: pharmacy.operating_hours,
        phone: pharmacy.phone,
      })
      .eq("id", pharmacy.id);

    if (error) {
      setMessage({ type: "error", text: "Gagal menyimpan pengaturan: " + error.message });
    } else {
      setMessage({ type: "success", text: "Pengaturan apotek berhasil disimpan." });
    }
    
    setSaving(false);
  };

  const handleDayToggle = (day: string, active: boolean) => {
    if (!pharmacy) return;
    const hours = { ...pharmacy.operating_hours };
    if (active) {
      hours[day] = { open: "08:00", close: "21:00" };
    } else {
      hours[day] = { open: "closed", close: "closed" };
    }
    setPharmacy({ ...pharmacy, operating_hours: hours });
  };

  const handleTimeChange = (day: string, field: "open" | "close", value: string) => {
    if (!pharmacy) return;
    const hours = { ...pharmacy.operating_hours };
    hours[day] = {
      ...hours[day],
      [field]: value
    };
    setPharmacy({ ...pharmacy, operating_hours: hours });
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Data apotek tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Apotek</h1>
        <p className="text-sm text-muted-foreground">{pharmacy.name}</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Profil Apotek */}
          <div className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Profil Apotek</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Apotek</label>
                <input
                  type="text"
                  value={pharmacy.name || ""}
                  onChange={(e) => setPharmacy({ ...pharmacy, name: e.target.value })}
                  placeholder="Contoh: Apotek Sehat"
                  className="h-11 w-full rounded-md border border-input bg-background px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nomor WhatsApp Apotek</label>
                <input
                  type="tel"
                  value={pharmacy.phone || ""}
                  onChange={(e) => setPharmacy({ ...pharmacy, phone: e.target.value })}
                  placeholder="Contoh: 08123456789"
                  className="h-11 w-full rounded-md border border-input bg-background px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <p className="text-xs text-muted-foreground">Nomor ini akan dihubungi oleh pasien.</p>
              </div>
            </div>
          </div>

          {/* Status Apotek */}
          <div className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Status Operasional</h2>
            </div>
            
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-muted/50">
              <div>
                <p className="font-medium">Buka untuk Pesanan</p>
                <p className="text-xs text-muted-foreground">Aktifkan untuk menerima request antar obat baru.</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={pharmacy.is_active}
                  onChange={(e) => setPharmacy({ ...pharmacy, is_active: e.target.checked })}
                />
                <div className="block h-8 w-14 rounded-full bg-muted transition-colors peer-checked:bg-emerald-500"></div>
                <div className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-transform peer-checked:translate-x-6"></div>
              </div>
            </label>
          </div>

          {/* Jam Operasional */}
          <div className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Jam Buka & Tutup Apotek</h2>
            </div>

            <div className="divide-y divide-border/50">
              {Object.keys(DAY_LABELS).map((day) => {
                const dayConfig = pharmacy.operating_hours?.[day] || { open: "08:00", close: "21:00" };
                const isOpen = dayConfig.open !== "closed";

                return (
                  <div key={day} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                      <span className="w-20 font-medium text-sm">{DAY_LABELS[day]}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isOpen}
                          onChange={(e) => handleDayToggle(day, e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ml-2 text-xs font-semibold text-muted-foreground peer-checked:text-foreground">
                          {isOpen ? "Buka" : "Tutup"}
                        </span>
                      </label>
                    </div>

                    {isOpen && (
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <input
                          type="text"
                          placeholder="08:00"
                          value={dayConfig.open}
                          onChange={(e) => handleTimeChange(day, "open", e.target.value)}
                          className="w-20 h-9 rounded-lg border border-input bg-background px-2 text-center text-xs focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-muted-foreground">s/d</span>
                        <input
                          type="text"
                          placeholder="21:00"
                          value={dayConfig.close}
                          onChange={(e) => handleTimeChange(day, "close", e.target.value)}
                          className="w-20 h-9 rounded-lg border border-input bg-background px-2 text-center text-xs focus:border-primary focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Jangkauan & Ongkir */}
          <div className="rounded-lg border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Pengiriman & Ongkir</h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Radius Pengiriman Maksimal (KM)</label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={pharmacy.delivery_radius_km}
                  onChange={(e) => setPharmacy({ ...pharmacy, delivery_radius_km: parseFloat(e.target.value) || 0 })}
                  className="h-11 w-full rounded-md border border-input bg-background px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <p className="text-xs text-muted-foreground">Pasien di luar radius ini tidak dapat membuat pesanan.</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Banknote className="h-4 w-4" /> Tarif Dasar (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={pharmacy.delivery_fee_base}
                  onChange={(e) => setPharmacy({ ...pharmacy, delivery_fee_base: parseInt(e.target.value) || 0 })}
                  className="h-11 w-full rounded-md border border-input bg-background px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jarak Tarif Dasar (KM)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={pharmacy.delivery_fee_base_km ?? 1}
                  onChange={(e) => setPharmacy({ ...pharmacy, delivery_fee_base_km: parseFloat(e.target.value) || 0 })}
                  className="h-11 w-full rounded-md border border-input bg-background px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <p className="text-xs text-muted-foreground">Jarak pengiriman (KM pertama) yang tercakup dalam tarif dasar.</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Banknote className="h-4 w-4" /> Tarif Tambahan per KM (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={pharmacy.delivery_fee_per_km}
                  onChange={(e) => setPharmacy({ ...pharmacy, delivery_fee_per_km: parseInt(e.target.value) || 0 })}
                  className="h-11 w-full rounded-md border border-input bg-background px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {message.text && (
            <div className={`flex items-center gap-2 rounded-md p-4 text-sm ${message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-50 text-emerald-600'}`}>
              <AlertCircle className="h-5 w-5 shrink-0" />
              {message.text}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
