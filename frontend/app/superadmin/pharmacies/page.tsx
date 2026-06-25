"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Store, Plus, MapPin, CheckCircle2, AlertCircle, Pencil, Trash2, X } from "lucide-react";
import type { Pharmacy } from "@/lib/types";
import { LocationSearch } from "@/components/location-search";
import { MapPicker } from "@/components/map-picker";

export default function SuperAdminPharmaciesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);
  
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
    is_active: true,
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

  const handleStartEdit = (pharmacy: Pharmacy) => {
    setEditingId(pharmacy.id);
    setFormData({
      name: pharmacy.name,
      address: pharmacy.address,
      latitude: pharmacy.latitude.toString(),
      longitude: pharmacy.longitude.toString(),
      kabupaten: pharmacy.kabupaten || "",
      kecamatan: pharmacy.kecamatan || "",
      desa: pharmacy.desa || "",
      delivery_radius_km: pharmacy.delivery_radius_km,
      delivery_fee_base: pharmacy.delivery_fee_base,
      delivery_fee_per_km: pharmacy.delivery_fee_per_km,
      is_active: pharmacy.is_active,
    });
    setShowForm(true);
    setMessage({ type: "", text: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
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
      is_active: true,
    });
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    const payload = {
      name: formData.name,
      address: formData.address,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      kabupaten: formData.kabupaten || null,
      kecamatan: formData.kecamatan || null,
      desa: formData.desa || null,
      delivery_radius_km: formData.delivery_radius_km,
      delivery_fee_base: formData.delivery_fee_base,
      delivery_fee_per_km: formData.delivery_fee_per_km,
      is_active: formData.is_active,
    };

    let error = null;

    if (editingId) {
      const res = await supabase.from("pharmacies").update(payload).eq("id", editingId);
      error = res.error;
    } else {
      const res = await supabase.from("pharmacies").insert([payload]);
      error = res.error;
    }

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({
        type: "success",
        text: editingId ? "Apotek berhasil diperbarui!" : "Apotek berhasil ditambahkan!",
      });
      handleCancelForm();
      fetchPharmacies();
    }
    setSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirmId) return;
    setMessage({ type: "", text: "" });

    const { error } = await supabase.from("pharmacies").delete().eq("id", showDeleteConfirmId);

    if (error) {
      if (error.code === "23503") {
        // Foreign Key Violation
        setMessage({
          type: "error",
          text: "Apotek tidak dapat dihapus karena memiliki data staf atau pesanan aktif terkait. Anda disarankan untuk menonaktifkan status apotek saja.",
        });
      } else {
        setMessage({ type: "error", text: "Gagal menghapus apotek: " + error.message });
      }
    } else {
      setMessage({ type: "success", text: "Apotek berhasil dihapus." });
      fetchPharmacies();
    }
    setShowDeleteConfirmId(null);
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
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Tambah Apotek
          </button>
        )}
      </div>

      {message.text && !showForm && (
        <div className={`mb-6 flex items-center gap-2 rounded-md p-4 text-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {message.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {showForm && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <h2 className="text-lg font-bold">
              {editingId ? "Form Edit Apotek" : "Form Tambah Apotek Baru"}
            </h2>
            <button 
              onClick={handleCancelForm}
              className="rounded p-1 text-muted-foreground hover:bg-muted transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {message.text && (
            <div className={`mb-4 flex items-center gap-2 rounded-md p-4 text-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {message.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nama Apotek</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-10 w-full rounded-md border px-3 text-sm focus:border-rose-500 focus:outline-none" />
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
                    kabupaten: data.kabupaten || formData.kabupaten,
                    kecamatan: data.kecamatan || formData.kecamatan,
                    desa: data.desa || formData.desa
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
                className="h-10 w-full rounded-md border px-3 text-sm focus:border-rose-500 focus:outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kecamatan</label>
              <input 
                type="text" 
                value={formData.kecamatan} 
                onChange={e => setFormData({...formData, kecamatan: e.target.value})} 
                placeholder="Misal: Padalarang" 
                className="h-10 w-full rounded-md border px-3 text-sm focus:border-rose-500 focus:outline-none" 
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Desa / Kelurahan</label>
              <input 
                type="text" 
                value={formData.desa} 
                onChange={e => setFormData({...formData, desa: e.target.value})} 
                placeholder="Misal: Cimareme" 
                className="h-10 w-full rounded-md border px-3 text-sm focus:border-rose-500 focus:outline-none" 
              />
            </div>

            {/* Delivery Settings */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Radius Pengiriman (KM)</label>
              <input 
                required 
                type="number" 
                min="1" 
                value={formData.delivery_radius_km} 
                onChange={e => setFormData({...formData, delivery_radius_km: parseInt(e.target.value) || 0})} 
                className="h-10 w-full rounded-md border px-3 text-sm focus:border-rose-500 focus:outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tarif Dasar Pengiriman (Rp)</label>
              <input 
                required 
                type="number" 
                min="0" 
                value={formData.delivery_fee_base} 
                onChange={e => setFormData({...formData, delivery_fee_base: parseInt(e.target.value) || 0})} 
                className="h-10 w-full rounded-md border px-3 text-sm focus:border-rose-500 focus:outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tarif Tambahan per KM (Rp)</label>
              <input 
                required 
                type="number" 
                min="0" 
                value={formData.delivery_fee_per_km} 
                onChange={e => setFormData({...formData, delivery_fee_per_km: parseInt(e.target.value) || 0})} 
                className="h-10 w-full rounded-md border px-3 text-sm focus:border-rose-500 focus:outline-none" 
              />
            </div>

            {/* Status Aktif Toggle */}
            <div className="space-y-2 flex items-center gap-3 pt-6 md:col-span-1">
              <input 
                type="checkbox" 
                id="is_active" 
                checked={formData.is_active} 
                onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" 
              />
              <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">Apotek Aktif (Menerima Pesanan)</label>
            </div>
            
            {formData.latitude && (
              <div className="md:col-span-2 text-xs text-muted-foreground flex items-center gap-2 bg-slate-50 p-3 rounded-md border border-slate-100">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span>Koordinat tersimpan: {formData.latitude}, {formData.longitude}</span>
              </div>
            )}
            
            <div className="mt-4 flex justify-end md:col-span-2 gap-2">
              <button 
                type="button" 
                onClick={handleCancelForm}
                className="rounded-md border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Batal
              </button>
              <button 
                disabled={submitting} 
                type="submit" 
                className="rounded-md bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Apotek"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cards List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pharmacies.map(pharmacy => (
          <div key={pharmacy.id} className="rounded-lg border border-slate-200 bg-white/70 backdrop-blur-xl p-5 shadow-sm transition-all hover:shadow-md">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shadow-inner">
                  <Store className="h-5 w-5" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="truncate font-bold text-slate-900">{pharmacy.name}</h3>
                  <p className="truncate text-xs text-slate-500 font-mono">ID: {pharmacy.id.substring(0, 8)}...</p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => handleStartEdit(pharmacy)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-blue-600 transition"
                  title="Edit Apotek"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setShowDeleteConfirmId(pharmacy.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rose-600 transition"
                  title="Hapus Apotek"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="mb-3 flex items-start gap-2 text-sm text-slate-600 min-h-[40px]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-50 text-slate-400" />
              <span className="line-clamp-2 text-xs">{pharmacy.address}</span>
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pharmacy.is_active ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-100/80 text-slate-500'}`}>
                {pharmacy.is_active ? 'Aktif' : 'Non-aktif'}
              </span>
              <span className="text-xs font-semibold text-slate-500">Radius: {pharmacy.delivery_radius_km} KM</span>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-foreground">Hapus Apotek</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Apakah Anda yakin ingin menghapus apotek ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={() => setShowDeleteConfirmId(null)}
                className="rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
