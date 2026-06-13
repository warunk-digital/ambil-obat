"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Store, Plus, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import type { Pharmacy } from "@/lib/types";
import { LocationSearch } from "@/components/location-search";
import { MapPicker } from "@/components/map-picker";

export default function SuperAdminPharmaciesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    kabupaten: "",
    kecamatan: "",
    desa: "",
    delivery_radius_km: 10,
    delivery_fee_base: 5000,
    delivery_fee_per_km: 2000,
  });

  const fetchPharmacies = async () => {
    setLoading(true);
    const { data } = await supabase.from("pharmacies").select("*").order("created_at", { ascending: false });
    if (data) setPharmacies(data as Pharmacy[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPharmacies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    const payload = {
      ...formData,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
    };

    const { error } = await supabase.from("pharmacies").insert([payload]);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Apotek berhasil ditambahkan!" });
      setFormData({
        name: "", address: "", latitude: "", longitude: "", 
        kabupaten: "", kecamatan: "", desa: "",
        delivery_radius_km: 10, delivery_fee_base: 5000, delivery_fee_per_km: 2000
      });
      setShowForm(false);
      fetchPharmacies();
    }
    setSubmitting(false);
  };

  if (loading && pharmacies.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Apotek</h1>
          <p className="text-sm text-slate-500">Kelola seluruh apotek yang terdaftar di platform</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {showForm ? "Batal" : <><Plus className="h-4 w-4" /> Tambah Apotek</>}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Form Tambah Apotek Baru</h2>
          
          {message.text && (
            <div className={`mb-4 flex items-center gap-2 rounded-xl p-4 text-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {message.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nama Apotek</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-10 w-full rounded-xl border px-3 text-sm" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Cari Lokasi / Alamat Lengkap</label>
              <LocationSearch 
                defaultValue={formData.address}
                onSelect={(data) => {
                  setFormData({
                    ...formData,
                    address: data.address,
                    latitude: data.lat.toString(),
                    longitude: data.lng.toString(),
                    kabupaten: data.kabupaten,
                    kecamatan: data.kecamatan,
                    desa: data.desa
                  });
                }}
              />
            </div>

            {/* Map Picker */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Titik Koordinat Peta (Klik / Geser Marker untuk Memilih Lokasi)</label>
              <MapPicker 
                lat={formData.latitude ? parseFloat(formData.latitude) : -6.2088}
                lng={formData.longitude ? parseFloat(formData.longitude) : 106.8456}
                onChange={(address, lat, lng, kabupaten, kecamatan, desa) => {
                  setFormData(prev => ({
                    ...prev,
                    address,
                    latitude: lat.toString(),
                    longitude: lng.toString(),
                    kabupaten: kabupaten || prev.kabupaten,
                    kecamatan: kecamatan || prev.kecamatan,
                    desa: desa || prev.desa
                  }));
                }}
              />
            </div>

            {/* Kabupaten, Kecamatan, Desa */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Kabupaten / Kota</label>
              <input 
                type="text" 
                value={formData.kabupaten} 
                onChange={e => setFormData({...formData, kabupaten: e.target.value})} 
                placeholder="Misal: Bandung Barat" 
                className="h-10 w-full rounded-xl border px-3 text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kecamatan</label>
              <input 
                type="text" 
                value={formData.kecamatan} 
                onChange={e => setFormData({...formData, kecamatan: e.target.value})} 
                placeholder="Misal: Padalarang" 
                className="h-10 w-full rounded-xl border px-3 text-sm" 
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Desa / Kelurahan</label>
              <input 
                type="text" 
                value={formData.desa} 
                onChange={e => setFormData({...formData, desa: e.target.value})} 
                placeholder="Misal: Cimareme" 
                className="h-10 w-full rounded-xl border px-3 text-sm" 
              />
            </div>
            
            {formData.latitude && (
              <div className="md:col-span-2 text-xs text-muted-foreground flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span>Koordinat tersimpan: {formData.latitude}, {formData.longitude}</span>
              </div>
            )}
            
            <div className="mt-4 flex justify-end md:col-span-2">
              <button disabled={submitting} type="submit" className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                {submitting ? "Menyimpan..." : "Simpan Apotek"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pharmacies.map(pharmacy => (
          <div key={pharmacy.id} className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shadow-inner">
                <Store className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h3 className="truncate font-bold text-slate-900">{pharmacy.name}</h3>
                <p className="truncate text-xs text-slate-500">ID: {pharmacy.id.substring(0, 8)}...</p>
              </div>
            </div>
            <div className="mb-3 flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
              <span className="line-clamp-2">{pharmacy.address}</span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${pharmacy.is_active ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-100/80 text-slate-500'}`}>
                {pharmacy.is_active ? 'Aktif' : 'Non-aktif'}
              </span>
              <span className="text-xs font-medium text-slate-500">Radius: {pharmacy.delivery_radius_km} KM</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
