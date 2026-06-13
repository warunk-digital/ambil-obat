"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const MapPickerInner = dynamic(() => import("./map-picker-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs font-medium">Memuat Peta...</span>
      </div>
    </div>
  ),
});

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (address: string, lat: number, lng: number, kabupaten: string, kecamatan: string, desa: string) => void;
}

export function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  return <MapPickerInner lat={lat} lng={lng} onChange={onChange} />;
}
