"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { formatRupiah, formatDate, formatTime, fetchRouteData } from "@/lib/helpers";
import { STATUS_CONFIG } from "@/lib/types";
import type { DeliveryRequest, DeliveryStatus, User } from "@/lib/types";
import { 
  ArrowLeft, 
  MapPin, 
  Hash, 
  Truck, 
  User as UserIcon,
  Phone,
  MessageCircle,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import RouteMap from "@/components/route-map";

export default function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [couriers, setCouriers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);

  const PREDEFINED_REJECT_REASONS = [
    "Mohon Maaf Nomor Obat Tidak Tercatat pada RS/Apotek ini",
    "Stok obat sedang kosong",
    "Alamat pengiriman di luar jangkauan kami"
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch request details
      const { data: reqData } = await supabase
        .from("delivery_requests")
        .select("*, address:addresses(*), pharmacy:pharmacies(*), customer:users!delivery_requests_user_id_fkey(*), courier:users!delivery_requests_courier_id_fkey(*)")
        .eq("id", id)
        .single();

      if (reqData) {
        setRequest(reqData as unknown as DeliveryRequest);
        if (reqData.courier_id) {
          setSelectedCourier(reqData.courier_id);
        }

        // Fetch available couriers (including admins/owners who can deliver) for this pharmacy
        const { data: courierData } = await supabase
          .from("pharmacy_staff")
          .select("user:users(*), staff_role")
          .eq("pharmacy_id", reqData.pharmacy_id)
          .in("staff_role", ["courier", "admin", "owner"])
          .eq("is_active", true);

        if (courierData) {
          setCouriers(
            courierData.map((c: any) => ({
              ...c.user,
              full_name: c.staff_role !== "courier" 
                ? `${c.user.full_name} (${c.staff_role === "owner" ? "Owner" : "Admin"})` 
                : c.user.full_name
            }))
          );
        }
      }

      setLoading(false);
    };

    fetchData();
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

      console.log("Admin Request Detail Route Data:", {
        pharmacy: request.pharmacy,
        address: request.address,
        routePoints: routeData?.points?.length
      });

      if (isMounted && routeData?.points) {
        setRoutePoints(routeData.points);
      }
    };

    fetchPoints();
    return () => { isMounted = false; };
  }, [request?.pharmacy, request?.address]);

  const updateStatus = async (newStatus: DeliveryStatus, reason?: string) => {
    if (!request || !user) return;
    setUpdating(true);

    const updateData: any = { status: newStatus };
    if (newStatus === "courier_assigned" && selectedCourier) {
      updateData.courier_id = selectedCourier;
    }
    if (newStatus === "cancelled" && reason) {
      updateData.cancel_reason = reason;
    }

    const { error } = await supabase
      .from("delivery_requests")
      .update(updateData)
      .eq("id", id);

    if (!error) {
      setRequest({ ...request, ...updateData });
      if (newStatus === "cancelled") {
        setShowRejectForm(false);
      }
    }
    
    setUpdating(false);
  };

  const assignCourier = async () => {
    if (!selectedCourier) return;
    updateStatus("courier_assigned");
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Pesanan tidak ditemukan</p>
        <Link href="/admin/requests" className="mt-4 text-primary">Kembali</Link>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[request.status];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Detail Pesanan</h1>
          <p className="text-xs text-muted-foreground">{request.request_number}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Info */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Status Banner */}
          <div className={cn("flex items-center gap-4 rounded-2xl border p-5", statusInfo.color.replace('text-', 'border-').replace('bg-', 'bg-opacity-10 bg-'))}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/50 text-2xl shadow-sm">
              {statusInfo.icon}
            </div>
            <div>
              <h2 className="font-bold">{statusInfo.label}</h2>
              <p className="text-sm opacity-80">{statusInfo.description}</p>
            </div>
          </div>

          {/* Action Panel */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold">Aksi Admin</h3>
            
            <div className="flex flex-wrap gap-3">
              {request.status === "pending" && (
                <button
                  onClick={() => updateStatus("confirmed")}
                  disabled={updating}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Konfirmasi Obat Siap
                </button>
              )}

              {request.status === "pending" && !showRejectForm && (
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={updating}
                  className="flex items-center gap-2 rounded-xl bg-destructive/10 px-5 py-2.5 text-sm font-semibold text-destructive transition-all hover:bg-destructive/20 disabled:opacity-50"
                >
                  Tolak / Batalkan
                </button>
              )}

              {showRejectForm && (
                <div className="w-full mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 animate-in fade-in slide-in-from-top-2">
                  <p className="mb-2 text-sm font-semibold text-destructive">Alasan Penolakan</p>
                  
                  <div className="mb-3 flex flex-wrap gap-2">
                    {PREDEFINED_REJECT_REASONS.map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setRejectReason(reason)}
                        className="rounded-lg bg-background px-3 py-1.5 text-xs border border-border hover:border-destructive transition-colors text-left"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Tulis alasan penolakan..."
                    className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:border-destructive focus:ring-1 focus:ring-destructive focus:outline-none mb-3 min-h-[80px]"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus("cancelled", rejectReason)}
                      disabled={updating || !rejectReason.trim()}
                      className="flex-1 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Kirim Penolakan"}
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason("");
                      }}
                      disabled={updating}
                      className="flex-1 rounded-xl bg-background border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {(request.status === "confirmed" || request.status === "pending") && (
                <div className="mt-4 w-full rounded-xl border border-dashed border-border p-4 sm:mt-0 sm:w-auto sm:border-0 sm:p-0">
                  <p className="mb-2 text-xs font-medium text-muted-foreground sm:hidden">Pilih Kurir</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={selectedCourier}
                      onChange={(e) => setSelectedCourier(e.target.value)}
                      className="h-10 rounded-xl border border-input bg-background px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none sm:w-48"
                    >
                      <option value="">-- Pilih Kurir --</option>
                      {couriers.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                    <button
                      onClick={assignCourier}
                      disabled={updating || !selectedCourier}
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Tugaskan Kurir
                    </button>
                  </div>
                </div>
              )}

              {request.status === "courier_assigned" && (
                <button
                  onClick={() => updateStatus("picked_up")}
                  disabled={updating}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-700 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                  Konfirmasi Obat Telah Diambil
                </button>
              )}

              {request.status === "picked_up" && (
                <button
                  onClick={() => updateStatus("on_delivery")}
                  disabled={updating}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Mulai Pengantaran
                </button>
              )}

              {request.status === "on_delivery" && (
                <button
                  onClick={async () => {
                    setUpdating(true);
                    const { error } = await supabase
                      .from("delivery_requests")
                      .update({ 
                        status: "delivered", 
                        payment_status: "paid",
                        delivered_at: new Date().toISOString()
                      })
                      .eq("id", id);
                    if (!error) {
                      setRequest({ 
                        ...request, 
                        status: "delivered", 
                        payment_status: "paid",
                        delivered_at: new Date().toISOString()
                      });
                    }
                    setUpdating(false);
                  }}
                  disabled={updating}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Konfirmasi Diterima Pasien & Lunas (Selesai)
                </button>
              )}
            </div>
          </div>

          {/* Request Details */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold">Informasi Obat & Tujuan</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Hash className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nomor Obat</p>
                  <p className="text-lg font-bold">{request.medicine_number}</p>
                </div>
              </div>

              {request.medicine_description && (
                <div className="flex items-start gap-3">
                  <Package className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Deskripsi</p>
                    <p className="text-base">{request.medicine_description}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alamat Pengiriman</p>
                  <p className="font-semibold">{request.address?.label}</p>
                  <p className="text-sm">{request.address?.full_address}</p>
                  {request.address?.detail && <p className="text-sm text-muted-foreground">Detail: {request.address.detail}</p>}
                  {request.distance_km != null && <p className="mt-1 text-xs text-primary">Jarak: {request.distance_km.toFixed(1)} km</p>}
                </div>
              </div>

              {request.notes && (
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Catatan Customer:</p>
                  <p className="mt-1 text-sm">{request.notes}</p>
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

        </div>

        {/* Right Column - People & Payment */}
        <div className="space-y-6">
          
          {/* Customer */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold">Customer</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{request.customer?.full_name}</p>
                <p className="text-sm text-muted-foreground">{request.customer?.phone || "Tidak ada no telp"}</p>
              </div>
            </div>
            {request.customer?.phone && (
              <a 
                href={`https://wa.me/${request.customer.phone.replace(/^0/, '62')}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
              >
                <MessageCircle className="h-4 w-4" /> Hubungi via WA
              </a>
            )}
          </div>

          {/* Courier */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold">Kurir</h3>
            {request.courier ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                  <Truck className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold">{request.courier.full_name}</p>
                  <p className="text-sm text-muted-foreground">{request.courier.phone || "Tidak ada no telp"}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 py-6 text-center text-muted-foreground">
                <AlertCircle className="mb-2 h-6 w-6 opacity-50" />
                <p className="text-sm">Belum ada kurir ditugaskan</p>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-semibold">Pembayaran (COD)</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ongkos Kirim</span>
              <span className="text-lg font-bold text-primary">{formatRupiah(request.delivery_fee)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
              <span className="text-sm text-muted-foreground">Status Pembayaran</span>
              <span className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                request.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              )}>
                {request.payment_status === "paid" ? "Lunas" : "Belum Lunas"}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
