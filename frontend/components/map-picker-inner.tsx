"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue in Next.js
// Since L.Icon.Default is not initialized during SSR, we safely run this on the client
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  });
}

interface MapPickerInnerProps {
  lat: number;
  lng: number;
  onChange: (address: string, lat: number, lng: number, kabupaten: string, kecamatan: string, desa: string) => void;
}

export default function MapPickerInner({ lat, lng, onChange }: MapPickerInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [loadingGeocode, setLoadingGeocode] = useState(false);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
    if (!apiKey) return;

    setLoadingGeocode(true);
    try {
      const response = await fetch(
        `https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json?key=${apiKey}`
      );
      if (!response.ok) throw new Error("Gagal mengambil alamat dari koordinat");
      const data = await response.json();
      
      if (data.addresses && data.addresses.length > 0) {
        const addrInfo = data.addresses[0].address;
        const address = addrInfo.freeformAddress || `${latitude}, ${longitude}`;
        const kabupaten = addrInfo.countrySecondarySubdivision || addrInfo.municipality || "";
        const kecamatan = addrInfo.countryTertiarySubdivision || "";
        const desa = addrInfo.municipalitySubdivision || "";
        
        onChange(address, latitude, longitude, kabupaten, kecamatan, desa);
      }
    } catch (err) {
      console.error("Error reverse geocoding:", err);
    } finally {
      setLoadingGeocode(false);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
    mapRef.current = map;

    // Add OpenStreetMap tile layer (can use TomTom tiles too, but OSM is standard and free)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add draggable marker
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    // Handle marker drag
    marker.on("dragend", () => {
      const position = marker.getLatLng();
      reverseGeocode(position.lat, position.lng);
    });

    // Handle map click to reposition marker
    map.on("click", (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      reverseGeocode(clickLat, clickLng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker position if coordinates change externally (e.g. from search)
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const currentLatLng = markerRef.current.getLatLng();
      if (currentLatLng.lat !== lat || currentLatLng.lng !== lng) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], 15);
      }
    }
  }, [lat, lng]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border shadow-inner">
      <div ref={mapContainerRef} className="h-64 w-full z-10" />
      {loadingGeocode && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-xs flex items-center justify-center z-20">
          <div className="bg-card px-4 py-2 rounded-full shadow-md text-xs font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Mencari Alamat...
          </div>
        </div>
      )}
    </div>
  );
}
