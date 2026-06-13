"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { useDebounce } from "../hooks/use-debounce";

interface TomTomResult {
  id: string;
  address: {
    freeformAddress: string;
    countrySecondarySubdivision?: string; // Kabupaten/Kota
    countryTertiarySubdivision?: string;    // Kecamatan
    municipalitySubdivision?: string;       // Kelurahan/Desa
    municipality?: string;                  // Fallback Kota
  };
  position: {
    lat: number;
    lon: number;
  };
}

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
  kabupaten: string;
  kecamatan: string;
  desa: string;
}

interface LocationSearchProps {
  onSelect: (data: LocationData) => void;
  defaultValue?: string;
  placeholder?: string;
}

export function LocationSearch({ onSelect, defaultValue = "", placeholder = "Cari alamat..." }: LocationSearchProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<TomTomResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  
  const debouncedQuery = useDebounce(query, 500);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync query with defaultValue when it changes externally (e.g. from Map Picker or GPS)
  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
    
    if (!apiKey) {
      setError("TomTom API Key belum diatur di .env.local");
      return;
    }

    if (!debouncedQuery || debouncedQuery.length < 3) {
      setResults([]);
      return;
    }

    const fetchPlaces = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `https://api.tomtom.com/search/2/search/${encodeURIComponent(debouncedQuery)}.json?key=${apiKey}&countrySet=ID&limit=5`
        );
        
        if (!response.ok) throw new Error("Gagal mengambil data dari TomTom");
        
        const data = await response.json();
        setResults(data.results || []);
        setOpen(true);
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    if (debouncedQuery !== defaultValue) {
      fetchPlaces();
    }
  }, [debouncedQuery, defaultValue]);

  const handleSelect = (result: TomTomResult) => {
    const address = result.address.freeformAddress;
    setQuery(address);
    setOpen(false);

    // Parse kabupaten, kecamatan, desa
    const addressInfo = result.address;
    const kabupaten = addressInfo.countrySecondarySubdivision || addressInfo.municipality || "";
    const kecamatan = addressInfo.countryTertiarySubdivision || "";
    const desa = addressInfo.municipalitySubdivision || "";

    onSelect({
      address,
      lat: result.position.lat,
      lng: result.position.lon,
      kabupaten,
      kecamatan,
      desa
    });
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <input
          type="text"
          className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
        />
      </div>

      {error && (
        <p className="mt-1 text-[10px] text-destructive">{error}</p>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-55 mt-2 w-full rounded-xl border border-border/50 bg-card p-1 shadow-lg backdrop-blur-xl">
          <div className="max-h-60 overflow-y-auto p-1">
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelect(result)}
                className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-3 w-3 text-primary" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{result.address.freeformAddress}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Lat: {result.position.lat.toFixed(4)}, Lng: {result.position.lon.toFixed(4)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
