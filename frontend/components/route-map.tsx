"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import for Leaflet map wrapper to avoid SSR issues
const RouteMapInner = dynamic<RouteMapProps>(() => import("@/components/route-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-border bg-muted/20">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-xs font-medium">Memuat Peta Rute...</span>
      </div>
    </div>
  ),
});

interface RouteMapProps {
  pharmacyLat: number;
  pharmacyLng: number;
  userLat: number;
  userLng: number;
  routePoints: { lat: number; lng: number }[];
}

export default function RouteMap(props: RouteMapProps) {
  return <RouteMapInner {...props} />;
}
