"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { formatRupiah, formatDate, formatTime, fetchRouteData } from "@/lib/helpers";
import { STATUS_CONFIG } from "@/lib/types";
import type { DeliveryRequest, DeliveryStatus } from "@/lib/types";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Store, 
  Navigation,
  Clock,
  Package,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import RouteMap from "@/components/route-map";
import { Button } from "@/components/ui/button";

export default function CourierRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: reqData } = await supabase
        .from("delivery_requests")
        .select("*, address:addresses(*), pharmacy:pharmacies(*), customer:users!delivery_requests_user_id_fkey(*)")
        .eq("id", id)
        .single();

      if (reqData) {
        setRequest(reqData as unknown as DeliveryRequest);
      }

      setLoading(false);
    };

    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel(`courier_req_${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_requests",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setRequest((prev) => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  useEffect(() => {
    let isMounted = true;
    if (!request?.pharmacy || !request?.address) return;

    const fetchPoints = async () => {
      const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
      if (!apiKey) return;

      const routeData = await fetchRouteData(
        request.pharmacy!.latitude,
        request.pharmacy!.longitude,
        request.address!.latitude!,
        request.address!.longitude!,
        apiKey
      );

      if (isMounted && routeData?.points) {
        setRoutePoints(routeData.points);
      }
    };

    fetchPoints();
    return () => { isMounted = false; };
  }, [request?.pharmacy, request?.address]);

  const updateStatus = async (newStatus: DeliveryStatus) => {
    if (!request || !user) return;
    setUpdating(true);

    const updateData: any = { status: newStatus };
    if (newStatus === "delivered") {
      updateData.delivered_at = new Date().toISOString();
      updateData.payment_status = "paid"; // Assume COD is paid upon delivery
    }

    const { error } = await supabase
      .from("delivery_requests")
      .update(updateData)
      .eq("id", id);

    if (!error) {
      // Create status log
      await supabase.from("request_status_logs").insert({
        request_id: id,
        status: newStatus,
        created_by: user.id,
      });

      setRequest({ ...request, ...updateData });
    } else {
      alert("Gagal memperbarui status: " + error.message);
    }
    
    setUpdating(false);
  };

  const takeTask = async () => {
    if (!request || !user) return;
    setUpdating(true);

    const { data, error } = await supabase
      .from("delivery_requests")
      .update({ status: "courier_assigned", courier_id: user.id })
      .eq("id", id)
      .eq("status", "confirmed")
      .is("courier_id", null)
      .select()
      .single();

    if (!error && data) {
      // Create status log
      await supabase.from("request_status_logs").insert({
        request_id: id,
        status: "courier_assigned",
        created_by: user.id,
        note: "Diambil otomatis oleh kurir (Grab)"
      });

      setRequest(data as unknown as DeliveryRequest);
    } else {
      alert("Gagal mengambil tugas. Pesanan ini mungkin sudah diambil oleh kurir lain.");
      router.push("/courier");
    }
    
    setUpdating(false);
  };

  const openWhatsApp = () => {
    if (!request?.customer?.phone) return;
    // Format phone number (remove leading 0 and add 62)
    let phone = request.customer.phone;
    if (phone.startsWith("0")) phone = "62" + phone.slice(1);
    
    const message = `Halo Kak ${request.customer.full_name}, saya kurir dari ${request.pharmacy?.name || 'Apotek'}. Saya sedang mengantar obat pesanan Anda (No: ${request.request_number}).`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const openGoogleMaps = () => {
    if (!request?.address?.latitude || !request?.address?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${request.address.latitude},${request.address.longitude}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">Memuat detail tugas...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center dark:bg-slate-950">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive/50" />
        <h2 className="text-lg font-bold">Tugas Tidak Ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tugas pengantaran ini mungkin sudah dihapus atau Anda tidak memiliki akses.
        </p>
        <Button onClick={() => router.push("/courier")} className="mt-6">
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  // Determine next action button based on current status
  let actionButton = null;
  if (request.status === "confirmed" && !request.courier_id) {
    actionButton = (
      <Button 
        onClick={takeTask} 
        disabled={updating}
        className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
      >
        {updating ? "Memproses..." : "Ambil Tugas Ini"}
      </Button>
    );
  } else if (request.status === "courier_assigned" && request.courier_id === user?.id) {
    actionButton = (
      <Button 
        onClick={() => updateStatus("picked_up")} 
        disabled={updating}
        className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
      >
        {updating ? "Memproses..." : "Obat Sudah Diambil di Apotek"}
      </Button>
    );
  } else if (request.status === "picked_up" && request.courier_id === user?.id) {
    actionButton = (
      <Button 
        onClick={() => updateStatus("on_delivery")} 
        disabled={updating}
        className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
      >
        <Navigation className="mr-2 h-4 w-4" />
        {updating ? "Memproses..." : "Mulai Jalan ke Tujuan"}
      </Button>
    );
  } else if (request.status === "on_delivery" && request.courier_id === user?.id) {
    actionButton = (
      <Button 
        onClick={() => updateStatus("delivered")} 
        disabled={updating}
        className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
      >
        <CheckCircle2 className="mr-2 h-5 w-5" />
        {updating ? "Memproses..." : "Selesaikan Pengiriman"}
      </Button>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 bg-card px-4 py-4 shadow-sm">
        <button 
          onClick={() => router.push("/courier")}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-sm font-bold">{request.request_number}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDate(request.created_at)}, {formatTime(request.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Status Saat Ini</span>
            <div
              className="flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: STATUS_CONFIG[request.status]?.textColor,
                backgroundColor: STATUS_CONFIG[request.status]?.bgColor,
              }}
            >
              {STATUS_CONFIG[request.status]?.label}
            </div>
          </div>
        </div>

        {/* Route Map Preview */}
        {request.pharmacy && request.address && routePoints.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <label className="mb-2 block text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
              Peta Rute Navigasi
            </label>
            <RouteMap
              pharmacyLat={request.pharmacy.latitude}
              pharmacyLng={request.pharmacy.longitude}
              userLat={request.address.latitude!}
              userLng={request.address.longitude!}
              routePoints={routePoints}
            />
            
            <Button 
              onClick={openGoogleMaps}
              variant="outline" 
              className="mt-3 w-full h-10 rounded-xl font-medium text-primary border-primary/20 hover:bg-primary/5"
            >
              <Navigation className="mr-2 h-4 w-4" /> Buka di Google Maps
            </Button>
          </div>
        )}

        {/* Origin & Destination */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="relative">
            {/* Connecting Dashed Line */}
            <div className="absolute left-[15px] top-8 bottom-8 w-0 border-l-2 border-dashed border-border" />
            
            {/* Pickup Point */}
            <div className="relative flex items-start gap-4 mb-6">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 z-10">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Apotek (Ambil Obat)</p>
                <p className="font-semibold">{request.pharmacy?.name}</p>
                <p className="text-sm text-muted-foreground">{request.pharmacy?.address}</p>
              </div>
            </div>

            {/* COD Tagihan */}
            <div className="relative pl-12 mb-6">
              <div className="rounded-xl bg-primary/5 p-3 inline-block">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Tagihan COD ke Pelanggan</p>
                <p className="text-lg font-bold text-primary">{formatRupiah(request.delivery_fee)}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Pastikan Anda menagih biaya ini.</p>
              </div>
            </div>

            {/* Delivery Point */}
            <div className="relative flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/50 z-10">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pelanggan (Tujuan)</p>
                <p className="font-semibold">{request.address?.label || "Alamat"}</p>
                <p className="text-sm text-muted-foreground">{request.address?.full_address}</p>
                {request.address?.detail && (
                  <p className="mt-1 rounded bg-muted p-1.5 text-xs">Patokan: {request.address.detail}</p>
                )}
              </div>
            </div>
          </div>

          {/* Customer Contact */}
          <div className="mt-6 border-t border-border pt-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-slate-50/50 p-3 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold">{request.customer?.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{request.customer?.phone || "-"}</p>
                </div>
              </div>
              {request.customer?.phone && (
                <Button size="icon" variant="ghost" onClick={openWhatsApp} className="h-8 w-8 rounded-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 shrink-0">
                  <Phone className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold">Detail Pesanan</h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Nomor Obat</p>
              <p className="font-medium">{request.medicine_number}</p>
            </div>
            
            {request.medicine_description && (
              <div>
                <p className="text-xs text-muted-foreground">Deskripsi Obat</p>
                <p className="font-medium">{request.medicine_description}</p>
              </div>
            )}

            {request.notes && (
              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-500">Catatan Pelanggan:</p>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">{request.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      {actionButton && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card px-4 pt-4 pb-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="mx-auto max-w-md">
            {actionButton}
          </div>
        </div>
      )}
    </div>
  );
}
