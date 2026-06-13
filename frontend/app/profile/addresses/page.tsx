"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import type { Address } from "@/lib/types";
import {
  ArrowLeft,
  MapPin,
  Plus,
  Trash2,
  Star,
  Loader2,
  Home,
  Building,
  MapPinned,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationSearch } from "@/components/location-search";
import { MapPicker } from "@/components/map-picker";

const labelIcons: Record<string, typeof Home> = {
  Rumah: Home,
  Kantor: Building,
  Lainnya: MapPinned,
};

export default function AddressesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [label, setLabel] = useState("Rumah");
  const [fullAddress, setFullAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [kabupaten, setKabupaten] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [desa, setDesa] = useState("");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchAddresses = async () => {
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .order("is_default", { ascending: false });
      setAddresses((data || []) as Address[]);
      setLoading(false);
    };
    fetchAddresses();
  }, [user, supabase]);

  const handleAdd = async () => {
    if (!user || !fullAddress.trim()) return;
    setSaving(true);

    const { data } = await supabase
      .from("addresses")
      .insert({
        user_id: user.id,
        label,
        full_address: fullAddress.trim(),
        detail: detail.trim() || null,
        latitude: lat,
        longitude: lng,
        kabupaten: kabupaten.trim() || null,
        kecamatan: kecamatan.trim() || null,
        desa: desa.trim() || null,
        is_default: addresses.length === 0,
      })
      .select()
      .single();

    if (data) {
      setAddresses((prev) => [...prev, data as Address]);
      setShowForm(false);
      setFullAddress("");
      setLat(null);
      setLng(null);
      setKabupaten("");
      setKecamatan("");
      setDesa("");
      setDetail("");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("addresses").update({ is_deleted: true }).eq("id", id);
    if (error) {
      alert("Alamat gagal dihapus. Terjadi kesalahan pada server.");
      return;
    }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    // Unset all defaults
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
    // Set new default
    await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", id);

    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        is_default: a.id === id,
      })),
    );
  };

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <div className="bg-card px-6 pt-12 pb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base font-bold">Alamat Tersimpan</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kelola alamat pengiriman Anda
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {addresses.map((addr) => {
              const Icon = labelIcons[addr.label] || MapPin;
              return (
                <div
                  key={addr.id}
                  className={cn(
                    "rounded-2xl border bg-card p-4 shadow-sm transition-all",
                    addr.is_default
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{addr.label}</span>
                        {addr.is_default && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Utama
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {addr.full_address}
                      </p>
                      {addr.detail && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {addr.detail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        <Star className="h-3 w-3" />
                        Jadikan Utama
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 ml-auto"
                    >
                      <Trash2 className="h-3 w-3" />
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add New Address */}
            {showForm ? (
              <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold">Tambah Alamat Baru</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {["Rumah", "Kantor", "Lainnya"].map((lbl) => (
                      <button
                        key={lbl}
                        onClick={() => setLabel(lbl)}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          label === lbl
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted border border-border",
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <LocationSearch 
                    defaultValue={fullAddress}
                    onSelect={(data) => {
                      setFullAddress(data.address);
                      setLat(data.lat);
                      setLng(data.lng);
                      setKabupaten(data.kabupaten);
                      setKecamatan(data.kecamatan);
                      setDesa(data.desa);
                    }}
                  />

                  {/* Map Picker */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Titik Koordinat Peta</label>
                    <MapPicker 
                      lat={lat || -6.2088}
                      lng={lng || 106.8456}
                      onChange={(address, latitude, longitude, kab, kec, dsa) => {
                        setFullAddress(address);
                        setLat(latitude);
                        setLng(longitude);
                        setKabupaten(kab || kabupaten);
                        setKecamatan(kec || kecamatan);
                        setDesa(dsa || desa);
                      }}
                    />
                  </div>

                  {/* Kabupaten, Kecamatan, Desa */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Kabupaten</label>
                      <input
                        type="text"
                        value={kabupaten}
                        onChange={(e) => setKabupaten(e.target.value)}
                        placeholder="Kabupaten"
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Kecamatan</label>
                      <input
                        type="text"
                        value={kecamatan}
                        onChange={(e) => setKecamatan(e.target.value)}
                        placeholder="Kecamatan"
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] font-medium text-muted-foreground">Desa / Kelurahan</label>
                      <input
                        type="text"
                        value={desa}
                        onChange={(e) => setDesa(e.target.value)}
                        placeholder="Desa"
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {lat && lng && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted/50 p-2 rounded-lg">
                      <MapPin className="h-3 w-3 text-emerald-500" />
                      Koordinat tersimpan: {lat.toFixed(4)}, {lng.toFixed(4)}
                    </div>
                  )}
                  <input
                    type="text"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="Patokan / detail (opsional)"
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAdd}
                      className="h-10 rounded-xl text-xs"
                      disabled={saving || !fullAddress.trim() || !lat || !lng}
                    >
                      {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      Simpan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="h-10 rounded-xl text-xs"
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-5 text-sm font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Tambah Alamat Baru
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
