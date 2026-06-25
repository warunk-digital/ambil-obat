"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { createClient } from "@/lib/supabase/client";
import { calculateDistanceKm, isPharmacyOpen, formatRupiah } from "@/lib/helpers";
import type { PharmacyWithDistance } from "@/lib/types";
import {
  Search,
  MapPin,
  Clock,
  ChevronRight,
  Pill,
  Navigation,
  Truck,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [pharmacies, setPharmacies] = useState<PharmacyWithDistance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [loadingPharmacies, setLoadingPharmacies] = useState(true);

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setLocationError("Izinkan akses lokasi untuk melihat mitra layanan terdekat");
        },
      );
    }
  }, []);

  // Fetch pharmacies
  const fetchPharmacies = useCallback(async () => {
    setLoadingPharmacies(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("pharmacies")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (data) {
      const pharmaciesWithDistance = data.map((pharmacy) => ({
        ...pharmacy,
        distance_km: userLocation
          ? calculateDistanceKm(
              userLocation.lat,
              userLocation.lng,
              pharmacy.latitude,
              pharmacy.longitude,
            )
          : 0,
      })) as PharmacyWithDistance[];

      // Sort by distance if location available
      if (userLocation) {
        pharmaciesWithDistance.sort((a, b) => a.distance_km - b.distance_km);
      }

      setPharmacies(pharmaciesWithDistance);
    }
    setLoadingPharmacies(false);
  }, [userLocation]);

  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  // Filter pharmacies by search
  const filteredPharmacies = pharmacies.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  return (
    <div className="min-h-svh bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-primary via-primary/90 to-primary/80 px-6 pb-8 pt-12 text-primary-foreground shadow-lg">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-0 h-28 w-28 -translate-x-8 translate-y-8 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-sm font-medium text-primary-foreground/80">
            {greeting()} 👋
          </p>
          <h1 className="mt-1 text-xl font-bold text-primary-foreground">
            {profile?.full_name || "Selamat Datang"}
          </h1>
          <p className="mt-1 text-xs text-primary-foreground/70">
            Mau antar obat ke mana hari ini?
          </p>

          {/* Search Bar */}
          <div className="relative mt-5">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mitra layanan..."
              className="h-12 w-full rounded-2xl bg-card pl-11 pr-4 text-sm shadow-lg shadow-black/10 transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-white/30 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="scrollbar-hide -mt-1 flex gap-3 overflow-x-auto px-6 pt-4 pb-2">
        {[
          { icon: Truck, label: "Antar Cepat", desc: "Kurir apotek" },
          { icon: Shield, label: "Aman & Resmi", desc: "Apotek terdaftar" },
          { icon: Navigation, label: "Terdekat", desc: "Berdasarkan lokasi" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex min-w-[140px] items-center gap-3 rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Location Status */}
      {locationError && (
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl bg-warning/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
          <p className="text-xs text-warning-foreground">{locationError}</p>
        </div>
      )}

      {/* Pharmacy List */}
      <div className="px-6 pt-6 pb-nav">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Mitra Layanan {userLocation ? "Terdekat" : "Tersedia"}
          </h2>
          <span className="text-xs text-muted-foreground">
            {filteredPharmacies.length} mitra layanan
          </span>
        </div>

        {loadingPharmacies ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="shimmer h-28 rounded-2xl"
              />
            ))}
          </div>
        ) : filteredPharmacies.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Pill className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Tidak ada mitra layanan ditemukan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery
                ? "Coba ubah kata kunci pencarian"
                : "Belum ada mitra layanan terdaftar di area ini"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPharmacies.map((pharmacy) => {
              const isOpen = isPharmacyOpen(pharmacy);
              const withinRadius =
                !userLocation || pharmacy.distance_km <= pharmacy.delivery_radius_km;

              return (
                <Link
                  key={pharmacy.id}
                  href={user ? `/pharmacy/${pharmacy.id}` : `/login?redirect=/pharmacy/${pharmacy.id}`}
                  className={cn(
                    "group flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-200 touch-active",
                    "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
                    !isOpen && "opacity-60",
                  )}
                >
                  {/* Pharmacy Avatar */}
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 overflow-hidden">
                    {pharmacy.logo_url ? (
                      <img
                        src={pharmacy.logo_url}
                        alt={pharmacy.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Pill className="h-7 w-7 text-primary" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">
                        {pharmacy.name}
                      </h3>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          isOpen
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400",
                        )}
                      >
                        {isOpen ? "Buka" : "Tutup"}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{pharmacy.address}</span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                      {userLocation && (
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <Navigation className="h-3 w-3" />
                          {pharmacy.distance_km.toFixed(1)} km
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Ongkir mulai {formatRupiah(pharmacy.delivery_fee_base)}
                      </span>
                    </div>

                    {!withinRadius && userLocation && (
                      <p className="mt-1 text-[10px] text-destructive">
                        Di luar jangkauan pengiriman
                      </p>
                    )}
                  </div>

                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Not logged in CTA */}
      {!authLoading && !user && (
        <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-border/60 bg-card/95 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl"
          >
            Masuk untuk Pesan Antar Obat
          </Link>
        </div>
      )}

      {/* Bottom nav for authenticated users */}
      {user && <BottomNav />}
    </div>
  );
}
