"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import {
  formatRupiah,
  formatDate,
  formatTime,
  formatRelativeTime,
  generateWhatsAppLink,
  fetchRouteData,
} from "@/lib/helpers";
import { STATUS_CONFIG } from "@/lib/types";
import type { DeliveryRequest, DeliveryStatus, RequestStatusLog } from "@/lib/types";
import {
  ArrowLeft,
  MapPin,
  Hash,
  Truck,
  Phone,
  MessageCircle,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import RouteMap from "@/components/route-map";

const LOGICAL_STAGES = [
  { label: "Menunggu", statuses: ["pending"] },
  { label: "Diproses", statuses: ["confirmed", "courier_assigned"] },
  { label: "Diantar", statuses: ["picked_up", "on_delivery"] },
  { label: "Selesai", statuses: ["delivered"] }
];

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [statusLogs, setStatusLogs] = useState<RequestStatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [requestRes, logsRes] = await Promise.all([
        supabase
          .from("delivery_requests")
          .select("*, pharmacy:pharmacies(*), address:addresses(*), courier:users!delivery_requests_courier_id_fkey(*)")
          .eq("id", id)
          .single(),
        supabase
          .from("request_status_logs")
          .select("*")
          .eq("request_id", id)
          .order("created_at", { ascending: true }),
      ]);

      if (requestRes.data) setRequest(requestRes.data as unknown as DeliveryRequest);
      if (logsRes.data) setStatusLogs(logsRes.data as RequestStatusLog[]);
      setLoading(false);
    };

    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel(`request-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_requests",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setRequest((prev) =>
            prev ? { ...prev, ...(payload.new as Partial<DeliveryRequest>) } : prev,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_status_logs",
          filter: `request_id=eq.${id}`,
        },
        (payload) => {
          setStatusLogs((prev) => [...prev, payload.new as RequestStatusLog]);
        },
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

  const handleCopy = async () => {
    if (!request) return;
    await navigator.clipboard.writeText(request.request_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Pesanan tidak ditemukan</p>
        <Link href="/orders" className="mt-4 text-sm font-medium text-primary">
          Kembali ke daftar pesanan
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[request.status as DeliveryStatus];
  const currentStageIndex = LOGICAL_STAGES.findIndex(stage => 
    stage.statuses.includes(request.status as DeliveryStatus)
  );
  const isCancelled = request.status === "cancelled";

  return (
    <div className="min-h-svh bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card px-6 pt-12 pb-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base font-bold">Detail Pesanan</h1>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {request.request_number}
              </span>
              <button
                onClick={handleCopy}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-primary" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 space-y-4">
        {/* Status Card */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{statusInfo?.icon}</span>
            <div>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold"
                style={{
                  color: statusInfo?.textColor,
                  backgroundColor: statusInfo?.bgColor,
                }}
              >
                {statusInfo?.icon} {statusInfo?.label}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                {statusInfo?.description}
              </p>
              {isCancelled && request.cancel_reason && (
                <div className="mt-2 rounded-lg bg-destructive/10 p-2 border border-destructive/20">
                  <p className="text-xs font-semibold text-destructive mb-0.5">Alasan Penolakan:</p>
                  <p className="text-[11px] text-destructive/90">{request.cancel_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Steps */}
          {!isCancelled && (
            <div className="mt-5">
              <div className="flex items-center justify-between">
                {LOGICAL_STAGES.map((stage, idx) => {
                  const isCompleted = idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div key={idx} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all",
                            isCompleted
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                            isCurrent && "ring-4 ring-primary/20 scale-110",
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4.5 w-4.5" />
                          ) : (
                            <span className="text-xs font-semibold">{idx + 1}</span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "mt-1.5 text-center text-[10px] font-medium leading-tight",
                            isCurrent
                              ? "font-semibold text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {stage.label}
                        </span>
                      </div>
                      {idx < LOGICAL_STAGES.length - 1 && (
                        <div
                          className={cn(
                            "mx-1 h-0.5 flex-1 rounded-full transition-colors",
                            idx < currentStageIndex ? "bg-primary" : "bg-muted",
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order Info */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Informasi Pesanan</h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Nomor Obat</p>
                <p className="text-sm font-medium">{request.medicine_number}</p>
              </div>
            </div>

            {request.medicine_description && (
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Deskripsi</p>
                  <p className="text-sm">{request.medicine_description}</p>
                </div>
              </div>
            )}

            {request.pharmacy && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Apotek</p>
                  <p className="text-sm font-medium">{request.pharmacy.name}</p>
                  <p className="text-xs text-muted-foreground">{request.pharmacy.address}</p>
                  
                  {request.pharmacy.phone && (
                    <a 
                      href={`https://wa.me/${request.pharmacy.phone.replace(/^0/, '62')}?text=${encodeURIComponent(`Halo ${request.pharmacy.name}, saya ingin menanyakan pesanan ${request.request_number} atau Nomor Obat ${request.medicine_number}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-4 w-4" /> Hubungi Apotek via WA
                    </a>
                  )}
                </div>
              </div>
            )}

            {request.address && (
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Dikirim ke</p>
                  <p className="text-sm font-medium">{request.address.label}</p>
                  <p className="text-xs text-muted-foreground">{request.address.full_address}</p>
                  {request.address.detail && (
                    <p className="text-xs text-muted-foreground">({request.address.detail})</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Waktu Pesan</p>
                <p className="text-sm">
                  {formatDate(request.created_at)} • {formatTime(request.created_at)}
                </p>
              </div>
            </div>

            {request.notes && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground">CATATAN</p>
                <p className="text-xs">{request.notes}</p>
              </div>
            )}
            
            {/* Route Map Preview */}
            {request.pharmacy && request.address && routePoints.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Peta Rute Pengiriman
                </label>
                <RouteMap
                  pharmacyLat={request.pharmacy.latitude}
                  pharmacyLng={request.pharmacy.longitude}
                  userLat={request.address.latitude!}
                  userLng={request.address.longitude!}
                  routePoints={routePoints}
                />
              </div>
            )}
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Pembayaran</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ongkos Kirim</span>
            <span className="text-sm font-bold">{formatRupiah(request.delivery_fee)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">Metode</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
              COD - Bayar di Tempat
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                request.payment_status === "paid"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
              )}
            >
              {request.payment_status === "paid" ? "Lunas" : "Belum Bayar"}
            </span>
          </div>
        </div>

        {/* Courier Info */}
        {request.courier && (
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Kurir</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{request.courier.full_name}</p>
                {request.courier.phone && (
                  <p className="text-xs text-muted-foreground">{request.courier.phone}</p>
                )}
              </div>
              {request.courier.phone && (
                <div className="flex gap-2">
                  <a
                    href={`tel:${request.courier.phone}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                  <a
                    href={generateWhatsAppLink(
                      request.courier.phone,
                      `Halo, saya pelanggan dengan nomor pesanan ${request.request_number}`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Timeline */}
        {statusLogs.length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Riwayat Status</h3>
            <div className="space-y-0">
              {statusLogs.map((log, idx) => (
                <div key={log.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        idx === statusLogs.length - 1
                          ? "bg-primary pulse-dot"
                          : "bg-muted-foreground/30",
                      )}
                    />
                    {idx < statusLogs.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className="text-xs font-medium">
                      {STATUS_CONFIG[log.status as DeliveryStatus]?.label || log.status}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Pharmacy */}
        {request.pharmacy?.phone && (
          <a
            href={generateWhatsAppLink(
              request.pharmacy.phone,
              `Halo ${request.pharmacy.name}, saya ingin menanyakan pesanan ${request.request_number}`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
          >
            <MessageCircle className="h-4 w-4" />
            Hubungi Apotek via WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
