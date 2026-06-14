"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  isPharmacyOpen,
  formatRupiah,
  calculateDistanceKm,
  calculateDeliveryFee,
} from "@/lib/helpers";
import type { Pharmacy, Address } from "@/lib/types";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Navigation,
  Pill,
  Loader2,
  Hash,
  FileText,
  StickyNote,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Truck,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationSearch } from "@/components/location-search";
import { MapPicker } from "@/components/map-picker";

export default function PharmacyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requestNumber, setRequestNumber] = useState("");

  // Form state
  const [medicineNumber, setMedicineNumber] = useState("");
  const [medicineDescription, setMedicineDescription] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Guest form state
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestAddress, setGuestAddress] = useState("");

  // New address form
  const [newAddressLabel, setNewAddressLabel] = useState("Rumah");
  const [newAddressDetail, setNewAddressDetail] = useState("");
  const [newAddressFull, setNewAddressFull] = useState("");
  const [newAddressLat, setNewAddressLat] = useState<number | null>(null);
  const [newAddressLng, setNewAddressLng] = useState<number | null>(null);
  const [newAddressKabupaten, setNewAddressKabupaten] = useState("");
  const [newAddressKecamatan, setNewAddressKecamatan] = useState("");
  const [newAddressDesa, setNewAddressDesa] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [pharmacyRes, addressRes] = await Promise.all([
        supabase.from("pharmacies").select("*").eq("id", id).single(),
        user
          ? supabase.from("addresses").select("*").eq("user_id", user.id).eq("is_deleted", false).order("is_default", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      if (pharmacyRes.data) setPharmacy(pharmacyRes.data as Pharmacy);
      if (addressRes.data) {
        setAddresses(addressRes.data as Address[]);
        const defaultAddr = (addressRes.data as Address[]).find((a) => a.is_default);
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      }

      setLoading(false);
    };

    fetchData();
  }, [id, user, supabase]);

  // Calculate delivery fee
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const distanceKm =
    pharmacy && selectedAddress?.latitude && selectedAddress?.longitude
      ? calculateDistanceKm(
          pharmacy.latitude,
          pharmacy.longitude,
          selectedAddress.latitude,
          selectedAddress.longitude,
        )
      : null;
  const deliveryFee =
    pharmacy && distanceKm != null
      ? calculateDeliveryFee(pharmacy, distanceKm)
      : null;
  const isWithinRadius =
    pharmacy && distanceKm != null
      ? distanceKm <= pharmacy.delivery_radius_km
      : true;

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation tidak didukung oleh browser Anda");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setNewAddressLat(latitude);
        setNewAddressLng(longitude);

        // Reverse geocode via TomTom API
        const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
        if (apiKey) {
          try {
            const response = await fetch(
              `https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json?key=${apiKey}`
            );
            if (response.ok) {
              const data = await response.json();
              if (data.addresses && data.addresses.length > 0) {
                const addrInfo = data.addresses[0].address;
                setNewAddressFull(addrInfo.freeformAddress || `${latitude}, ${longitude}`);
                setNewAddressKabupaten(addrInfo.countrySecondarySubdivision || addrInfo.municipality || "");
                setNewAddressKecamatan(addrInfo.countryTertiarySubdivision || "");
                setNewAddressDesa(addrInfo.municipalitySubdivision || "");
              }
            }
          } catch (err) {
            console.error("Error reverse geocoding:", err);
          }
        }
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting position:", error);
        alert("Gagal mendapatkan lokasi Anda. Pastikan izin lokasi diaktifkan.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddAddress = async () => {
    if (!user || !newAddressFull || !newAddressLat || !newAddressLng) return;

    const { data } = await supabase
      .from("addresses")
      .insert({
        user_id: user.id,
        label: newAddressLabel,
        full_address: newAddressFull.trim(),
        detail: newAddressDetail.trim() || null,
        latitude: newAddressLat,
        longitude: newAddressLng,
        kabupaten: newAddressKabupaten.trim() || null,
        kecamatan: newAddressKecamatan.trim() || null,
        desa: newAddressDesa.trim() || null,
        is_default: addresses.length === 0,
      })
      .select()
      .single();

    if (data) {
      const newAddr = data as Address;
      setAddresses((prev) => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      setShowAddressForm(false);
      
      // Reset form states
      setNewAddressFull("");
      setNewAddressDetail("");
      setNewAddressLat(null);
      setNewAddressLng(null);
      setNewAddressKabupaten("");
      setNewAddressKecamatan("");
      setNewAddressDesa("");
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!medicineNumber.trim() || !guestName.trim() || !guestAddress.trim()) {
      setError("Mohon lengkapi semua data wajib");
      return;
    }

    if (!pharmacy?.phone) {
      setError("Nomor WhatsApp apotek tidak tersedia");
      return;
    }

    const phone = pharmacy.phone.startsWith("0") 
      ? "62" + pharmacy.phone.slice(1) 
      : pharmacy.phone;

    let message = `Halo ${pharmacy.name},\nSaya ingin *Pesan Antar Obat* (Guest Order):\n\n`;
    message += `*Nama:* ${guestName.trim()}\n`;
    if (guestPhone.trim()) message += `*No. HP:* ${guestPhone.trim()}\n`;
    message += `*Nomor Obat:* ${medicineNumber.trim()}\n`;
    if (medicineDescription.trim()) message += `*Deskripsi Obat:* ${medicineDescription.trim()}\n`;
    message += `*Alamat Pengiriman:* ${guestAddress.trim()}\n`;
    if (notes.trim()) message += `*Catatan:* ${notes.trim()}`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) return;

    if (!medicineNumber.trim()) {
      setError("Nomor obat wajib diisi");
      return;
    }

    if (!selectedAddressId) {
      setError("Pilih alamat pengiriman");
      return;
    }

    if (!isWithinRadius) {
      setError("Alamat di luar jangkauan pengiriman apotek ini");
      return;
    }

    setSubmitting(true);

    const { data, error: insertError } = await supabase
      .from("delivery_requests")
      .insert({
        user_id: user.id,
        pharmacy_id: id,
        address_id: selectedAddressId,
        medicine_number: medicineNumber.trim(),
        medicine_description: medicineDescription.trim() || null,
        delivery_fee: deliveryFee || 0,
        distance_km: distanceKm,
        notes: notes.trim() || null,
      })
      .select("request_number")
      .single();

    if (insertError) {
      setError("Gagal membuat request. Coba lagi.");
      setSubmitting(false);
      return;
    }

    setRequestNumber((data as { request_number: string }).request_number);
    setSuccess(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Apotek tidak ditemukan</p>
        <Link href="/" className="mt-4 text-sm font-medium text-primary">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-6">
        <div className="mx-auto max-w-sm text-center page-enter">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-2 text-xl font-bold">Request Berhasil!</h2>
          <p className="text-sm text-muted-foreground">
            Nomor request Anda:
          </p>
          <p className="mt-2 rounded-xl bg-primary/10 px-4 py-3 text-lg font-bold text-primary">
            {requestNumber}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Apotek akan segera mengkonfirmasi request Anda. Anda dapat melacak
            status di halaman pesanan.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/orders"
              className="flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg"
            >
              Lihat Pesanan Saya
            </Link>
            <Link
              href="/"
              className="flex h-12 items-center justify-center rounded-2xl border border-border text-sm font-medium"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOpen = isPharmacyOpen(pharmacy);

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-6 pt-12 pb-6">
        <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
        <button
          onClick={() => router.back()}
          className="relative mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-primary-foreground backdrop-blur-sm transition-colors hover:bg-white/25"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Pill className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">
              {pharmacy.name}
            </h1>
            <div className="mt-1 flex items-center gap-1 text-xs text-primary-foreground/70">
              <MapPin className="h-3 w-3" />
              <span>{pharmacy.address}</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  isOpen
                    ? "bg-emerald-500/20 text-emerald-100"
                    : "bg-red-500/20 text-red-200",
                )}
              >
                {isOpen ? "● Buka" : "● Tutup"}
              </span>
              {pharmacy.phone && (
                <a
                  href={`tel:${pharmacy.phone}`}
                  className="flex items-center gap-1 text-[10px] text-primary-foreground/70"
                >
                  <Phone className="h-3 w-3" />
                  {pharmacy.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Request Form */}
      <div className="px-6 py-6">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-1 text-base font-semibold">Request Antar Obat</h2>
          <p className="mb-6 text-xs text-muted-foreground">
            Masukkan nomor obat yang sudah siap diambil di apotek
          </p>

          <form onSubmit={user ? handleSubmit : handleGuestSubmit} className="space-y-5">
            {!user && (
              <>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4 text-primary" />
                    Nama Pemesan <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Nama lengkap Anda"
                    required
                    className="flex h-12 w-full rounded-xl border border-input bg-card px-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-4 w-4 text-primary" />
                    No. WhatsApp
                    <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
                  </label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="0812xxxxxx"
                    className="flex h-12 w-full rounded-xl border border-input bg-card px-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Medicine Number */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Hash className="h-4 w-4 text-primary" />
                Nomor Obat <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={medicineNumber}
                onChange={(e) => setMedicineNumber(e.target.value)}
                placeholder="Contoh: A-001, 1234, dll"
                required
                className="flex h-12 w-full rounded-xl border border-input bg-card px-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            {/* Medicine Description */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                Deskripsi Obat
                <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
              </label>
              <input
                type="text"
                value={medicineDescription}
                onChange={(e) => setMedicineDescription(e.target.value)}
                placeholder="Contoh: Obat flu dan batuk"
                className="flex h-12 w-full rounded-xl border border-input bg-card px-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            {/* Delivery Address */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-primary" />
                Alamat Pengiriman <span className="text-destructive">*</span>
              </label>

              {!user ? (
                <textarea
                  value={guestAddress}
                  onChange={(e) => setGuestAddress(e.target.value)}
                  placeholder="Alamat lengkap (No. Rumah, RT/RW, Desa, dll)"
                  rows={3}
                  required
                  className="flex w-full rounded-xl border border-input bg-card px-4 py-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                />
              ) : addresses.length > 0 && !showAddressForm ? (
                <div className="space-y-2">
                  <div className="relative">
                    <select
                      value={selectedAddressId}
                      onChange={(e) => setSelectedAddressId(e.target.value)}
                      className="flex h-12 w-full appearance-none rounded-xl border border-input bg-card px-4 pr-10 text-sm shadow-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    >
                      <option value="">Pilih alamat...</option>
                      {addresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          {addr.label}: {addr.full_address}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="text-xs font-medium text-primary"
                  >
                    + Tambah alamat baru
                  </button>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border border-primary/20 bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Tambah Alamat Baru</span>
                    <div className="flex gap-1.5">
                      {["Rumah", "Kantor", "Lainnya"].map((lbl) => (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() => setNewAddressLabel(lbl)}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                            newAddressLabel === lbl
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted border border-border text-muted-foreground hover:bg-muted/80",
                          )}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Titik Lokasi (Map)</label>
                      <div className="relative overflow-hidden rounded-xl border border-input">
                        <MapPicker 
                          onLocationSelect={(lat, lng) => {
                            setNewAddressLat(lat);
                            setNewAddressLng(lng);
                          }} 
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleGetCurrentLocation}
                          disabled={gettingLocation}
                          className="absolute bottom-3 right-3 shadow-md"
                        >
                          {gettingLocation ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                          ) : (
                            <Navigation className="h-3 w-3 mr-1.5" />
                          )}
                          <span className="text-xs">Lokasi Saat Ini</span>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Alamat Lengkap</label>
                      <textarea
                        value={newAddressFull}
                        onChange={(e) => setNewAddressFull(e.target.value)}
                        placeholder="Nama jalan, RT/RW, dsb."
                        rows={2}
                        className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Kabupaten/Kota</label>
                        <input
                          type="text"
                          value={newAddressKabupaten}
                          onChange={(e) => setNewAddressKabupaten(e.target.value)}
                          placeholder="Kabupaten"
                          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Kecamatan</label>
                        <input
                          type="text"
                          value={newAddressKecamatan}
                          onChange={(e) => setNewAddressKecamatan(e.target.value)}
                          placeholder="Kecamatan"
                          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-medium text-muted-foreground">Kelurahan / Desa</label>
                        <input
                          type="text"
                          value={newAddressDesa}
                          onChange={(e) => setNewAddressDesa(e.target.value)}
                          placeholder="Desa"
                          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    {newAddressLat && newAddressLng && (
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-lg">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Koordinat pin: {newAddressLat.toFixed(6)}, {newAddressLng.toFixed(6)}</span>
                      </div>
                    )}

                    <input
                      type="text"
                      value={newAddressDetail}
                      onChange={(e) => setNewAddressDetail(e.target.value)}
                      placeholder="Detail patokan (No. Rumah, Blok, Cat Rumah, dll)"
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        onClick={handleAddAddress}
                        className="h-10 flex-1 rounded-xl text-xs"
                        disabled={!newAddressFull || !newAddressLat || !newAddressLng}
                      >
                        Simpan Alamat
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddressForm(false);
                          setNewAddressFull("");
                          setNewAddressDetail("");
                          setNewAddressLat(null);
                          setNewAddressLng(null);
                          setNewAddressKabupaten("");
                          setNewAddressKecamatan("");
                          setNewAddressDesa("");
                        }}
                        className="h-10 px-4 rounded-xl text-xs"
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <StickyNote className="h-4 w-4 text-primary" />
                Catatan
                <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan untuk kurir..."
                rows={2}
                className="flex w-full rounded-xl border border-input bg-card px-4 py-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
              />
            </div>

            {/* Delivery Fee Summary - ONLY SHOW FOR LOGGED IN USERS OR IF WE CAN CALCULATE */}
            {user && deliveryFee != null && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="font-medium">Ongkos Kirim</span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {formatRupiah(deliveryFee)}
                  </span>
                </div>
                {distanceKm != null && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Jarak: {distanceKm.toFixed(1)} km • Bayar saat terima (COD)
                  </p>
                )}
              </div>
            )}

            {/* Radius warning */}
            {user && !isWithinRadius && (
              <div className="flex items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <p className="text-xs text-destructive">
                  Alamat Anda di luar jangkauan pengiriman apotek ini (maks.{" "}
                  {pharmacy.delivery_radius_km} km)
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className={cn(
                "h-12 w-full rounded-2xl text-sm font-semibold shadow-lg",
                !user ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "shadow-primary/20"
              )}
              disabled={submitting || !isOpen || (user && !isWithinRadius)}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : !user ? (
                <Phone className="mr-2 h-4 w-4" />
              ) : (
                <Truck className="mr-2 h-4 w-4" />
              )}
              {!isOpen
                ? "Apotek Sedang Tutup"
                : submitting
                  ? "Mengirim Request..."
                  : !user 
                    ? "Pesan Instan via WhatsApp" 
                    : "Request Antar Obat"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
