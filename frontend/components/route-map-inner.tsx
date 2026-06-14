"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  });
}

interface RouteMapInnerProps {
  pharmacyLat: number;
  pharmacyLng: number;
  userLat: number;
  userLng: number;
  routePoints: { lat: number; lng: number }[];
}

export default function RouteMapInner({
  pharmacyLat,
  pharmacyLng,
  userLat,
  userLng,
  routePoints,
}: RouteMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current);
    mapRef.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Create markers
    // Pharmacy Marker (Green)
    const pharmacyIcon = L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([pharmacyLat, pharmacyLng], { icon: pharmacyIcon }).addTo(map).bindPopup("Apotek");

    // User Marker (Blue)
    const userIcon = L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup("Lokasi Pengiriman");

    // Draw route if points exist
    if (routePoints && routePoints.length > 0) {
      const latlngs = routePoints.map((p) => [p.lat, p.lng] as [number, number]);
      const polyline = L.polyline(latlngs, {
        color: "#3b82f6", // Blue route
        weight: 4,
        opacity: 0.8,
        lineJoin: "round",
      }).addTo(map);

      // Fit map bounds to show the entire route
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    } else {
      // If no route points, just fit bounds to the two markers
      const group = new L.FeatureGroup([
        L.marker([pharmacyLat, pharmacyLng]),
        L.marker([userLat, userLng]),
      ]);
      map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pharmacyLat, pharmacyLng, userLat, userLng, routePoints]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border shadow-inner">
      <div ref={mapContainerRef} className="h-64 w-full z-10" />
    </div>
  );
}
