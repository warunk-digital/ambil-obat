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
  fetchRouteData,
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
  FileText,
  StickyNote,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Truck,
  User,
  Calendar,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationSearch } from "@/components/location-search";
import { MapPicker } from "@/components/map-picker";
import RouteMap from "@/components/route-map";

export default function PharmacyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requestNumber, setRequestNumber] = useState("");

  // Form state
  const [patientName, setPatientName] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [isPatientInitialized, setIsPatientInitialized] = useState(false);
  const [medicineDescription, setMedicineDescription] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    if (profile?.full_name && !isPatientInitialized) {
      setPatientName(profile.full_name);
      setIsPatientInitialized(true);
    }
  }, [profile, isPatientInitialized]);

  // Routing and Fee state
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

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

  // Calculate delivery fee using routing distance
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchRoute = async () => {
      if (!pharmacy || !selectedAddress?.latitude || !selectedAddress?.longitude) {
        if (isMounted) setRouteDistanceKm(null);
        return;
      }
      
      const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
      if (!apiKey) {
        // Fallback to haversine if no API key
        if (isMounted) {
           setRouteDistanceKm(calculateDistanceKm(pharmacy.latitude, pharmacy.longitude, selectedAddress.latitude, selectedAddress.longitude));
           setRoutePoints([]);
        }
        return;
      }

      if (isMounted) setIsCalculatingRoute(true);
      
      try {
        const routeData = await fetchRouteData(pharmacy.latitude, pharmacy.longitude, selectedAddress.latitude, selectedAddress.longitude, apiKey);
        if (isMounted) {
           if (routeData !== null) {
             setRouteDistanceKm(routeData.distanceKm);
             setRoutePoints(routeData.points);
           } else {
             // Fallback to Haversine if API fails
             setRouteDistanceKm(calculateDistanceKm(pharmacy.latitude, pharmacy.longitude, selectedAddress.latitude, selectedAddress.longitude));
             setRoutePoints([]);
           }
        }
      } catch (err) {
         if (isMounted) {
            setRouteDistanceKm(calculateDistanceKm(pharmacy.latitude, pharmacy.longitude, selectedAddress.latitude, selectedAddress.longitude));
            setRoutePoints([]);
         }
      } finally {
        if (isMounted) setIsCalculatingRoute(false);
      }
    };

    fetchRoute();
    
    return () => {
      isMounted = false;
    };
  }, [selectedAddressId, addresses, pharmacy]);

  const deliveryFee =
    pharmacy && routeDistanceKm != null
      ? calculateDeliveryFee(pharmacy, routeDistanceKm)
      : null;
      
  const isWithinRadius =
    pharmacy && routeDistanceKm != null
      ? routeDistanceKm <= pharmacy.delivery_radius_km
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

  const handleDeleteAddress = async () => {
    if (!selectedAddressId || !user) return;
    
    if (!confirm("Apakah Anda yakin ingin menghapus alamat ini?")) return;

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", selectedAddressId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update state
      const newAddresses = addresses.filter(a => a.id !== selectedAddressId);
      setAddresses(newAddresses);
      
      // Auto-select another address if available
      if (newAddresses.length > 0) {
        setSelectedAddressId(newAddresses[0].id);
      } else {
        setSelectedAddressId("");
      }
    } catch (err: any) {
      setError(err.message || "Gagal menghapus alamat");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      router.push(`/login?redirect=/pharmacy/${id}`);
      return;
    }

    if (!patientName.trim()) {
      setError("Nama pasien wajib diisi");
      return;
    }

    if (!patientDob.trim()) {
      setError("Tanggal lahir wajib diisi");
      return;
    }

    if (!doctorName.trim()) {
      setError("Nama dokter wajib diisi");
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
        patient_name: patientName.trim(),
        patient_dob: patientDob.trim(),
        doctor_name: doctorName.trim(),
        medicine_description: medicineDescription.trim() || null,
        delivery_fee: deliveryFee || 0,
        distance_km: routeDistanceKm,
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
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm overflow-hidden">
            {pharmacy.logo_url ? (
              <img
                src={pharmacy.logo_url}
                alt={pharmacy.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Pill className="h-8 w-8 text-primary-foreground" />
            )}
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
            Masukkan detail informasi pasien dan dokter untuk pengantaran obat
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nama Pasien */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-primary" />
                Nama Pasien <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Nama lengkap pasien"
                required
                className="flex h-12 w-full rounded-md border border-input bg-card px-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">Otomatis tersimpan menggunakan nama profil Anda, tetapi dapat disesuaikan.</p>
            </div>

            {/* Tanggal Lahir */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                Tgl Lahir <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={patientDob}
                  onChange={(e) => setPatientDob(e.target.value)}
                  required
                  className={cn(
                    "flex items-center h-12 w-full rounded-md border border-input bg-card px-4 text-sm shadow-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
                    !patientDob ? "text-transparent" : "text-foreground"
                  )}
                  style={{
                    WebkitAppearance: "none",
                    minWidth: "100%",
                  }}
                />
                {!patientDob && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/50 pointer-events-none">
                    Pilih tanggal lahir...
                  </span>
                )}
              </div>
            </div>

            {/* Nama Dokter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Stethoscope className="h-4 w-4 text-primary" />
                Nama Dokter <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Nama dokter yang meresepkan"
                required
                className="flex h-12 w-full rounded-md border border-input bg-card px-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
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
                className="flex h-12 w-full rounded-md border border-input bg-card px-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            {/* Delivery Address */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-primary" />
                Alamat Pengiriman <span className="text-destructive">*</span>
              </label>

              {addresses.length > 0 && !showAddressForm ? (
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
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(true)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      + Tambah alamat baru
                    </button>
                    {selectedAddressId && (
                      <button
                        type="button"
                        onClick={handleDeleteAddress}
                        className="text-xs font-medium text-destructive hover:underline"
                      >
                        Hapus alamat
                      </button>
                    )}
                  </div>
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
                    {/* Autocomplete Search */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Cari Alamat</label>
                      <LocationSearch 
                        defaultValue={newAddressFull}
                        placeholder="Ketik alamat atau nama jalan..."
                        onSelect={(data) => {
                          setNewAddressFull(data.address);
                          setNewAddressLat(data.lat);
                          setNewAddressLng(data.lng);
                          setNewAddressKabupaten(data.kabupaten);
                          setNewAddressKecamatan(data.kecamatan);
                          setNewAddressDesa(data.desa);
                        }}
                      />
                    </div>

                    {/* Geolocation Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGetCurrentLocation}
                      disabled={gettingLocation}
                      className="flex items-center justify-center gap-2 h-10 w-full rounded-xl border border-input text-xs font-medium hover:bg-accent/50"
                    >
                      {gettingLocation ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Navigation className="h-3.5 w-3.5 text-primary fill-primary/10" />
                      )}
                      {gettingLocation ? "Mendapatkan Lokasi..." : "Gunakan Lokasi Terkini"}
                    </Button>

                    {/* Map Picker */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Titik Koordinat Peta</label>
                      <MapPicker 
                        lat={newAddressLat || pharmacy?.latitude || -6.2088}
                        lng={newAddressLng || pharmacy?.longitude || 106.8456}
                        onChange={(address, latitude, longitude, kab, kec, dsa) => {
                          setNewAddressFull(address);
                          setNewAddressLat(latitude);
                          setNewAddressLng(longitude);
                          setNewAddressKabupaten(kab || newAddressKabupaten);
                          setNewAddressKecamatan(kec || newAddressKecamatan);
                          setNewAddressDesa(dsa || newAddressDesa);
                        }}
                      />
                    </div>

                    {/* Kabupaten, Kecamatan, Desa */}
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

                    {/* Detail patokan */}
                    <input
                      type="text"
                      value={newAddressDetail}
                      onChange={(e) => setNewAddressDetail(e.target.value)}
                      placeholder="Detail patokan (No. Rumah, Blok, Cat Rumah, dll)"
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />

                    {/* Action buttons */}
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
                          // Reset form states
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
                className="flex w-full rounded-md border border-input bg-card px-4 py-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
              />
            </div>

            {/* Delivery Fee Summary */}
            {deliveryFee != null && (
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
                {routeDistanceKm != null && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Jarak tempuh: {routeDistanceKm.toFixed(1)} km • Bayar saat terima (COD)
                  </p>
                )}
              </div>
            )}

            {/* Radius warning */}
            {!isWithinRadius && (
              <div className="flex items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <p className="text-xs text-destructive">
                  Alamat Anda di luar jangkauan pengiriman apotek ini (maks.{" "}
                  {pharmacy.delivery_radius_km} km)
                </p>
              </div>
            )}

            {/* Route Map Preview */}
            {pharmacy && selectedAddress && routePoints.length > 0 && isWithinRadius && (
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Peta Rute Pengiriman
                </label>
                <RouteMap
                  pharmacyLat={pharmacy.latitude}
                  pharmacyLng={pharmacy.longitude}
                  userLat={selectedAddress.latitude!}
                  userLng={selectedAddress.longitude!}
                  routePoints={routePoints}
                />
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
              className="h-12 w-full rounded-md text-sm font-semibold shadow-lg shadow-primary/20"
              disabled={submitting || isCalculatingRoute || !isOpen || !isWithinRadius}
            >
              {submitting || isCalculatingRoute ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Truck className="mr-2 h-4 w-4" />
              )}
              {!isOpen
                ? "Apotek Sedang Tutup"
                : isCalculatingRoute
                  ? "Menghitung Jarak Tempuh..."
                  : submitting
                    ? "Mengirim Request..."
                    : "Request Antar Obat"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
