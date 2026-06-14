// Database types for Ambil Obat
// These match the Supabase PostgreSQL schema

export type UserRole = "customer" | "admin" | "super_admin";
export type StaffRole = "owner" | "admin" | "courier";
export type DeliveryStatus =
  | "pending"
  | "confirmed"
  | "courier_assigned"
  | "picked_up"
  | "on_delivery"
  | "delivered"
  | "cancelled";
export type PaymentMethod = "cod";
export type PaymentStatus = "unpaid" | "paid";

export interface User {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  logo_url: string | null;
  latitude: number;
  longitude: number;
  delivery_radius_km: number;
  delivery_fee_base: number;
  delivery_fee_base_km: number;
  delivery_fee_per_km: number;
  operating_hours: Record<
    string,
    { open: string; close: string }
  >;
  is_active: boolean;
  kabupaten?: string | null;
  kecamatan?: string | null;
  desa?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PharmacyStaff {
  id: string;
  user_id: string;
  pharmacy_id: string;
  staff_role: StaffRole;
  is_active: boolean;
  is_available: boolean;
  created_at: string;
  // Joined fields
  user?: User;
  pharmacy?: Pharmacy;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_address: string;
  detail: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  kabupaten?: string | null;
  kecamatan?: string | null;
  desa?: string | null;
  created_at: string;
}

export interface DeliveryRequest {
  id: string;
  request_number: string;
  user_id: string;
  pharmacy_id: string;
  address_id: string;
  courier_id: string | null;
  medicine_number: string;
  medicine_description: string | null;
  status: DeliveryStatus;
  delivery_fee: number;
  distance_km: number | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes: string | null;
  delivery_proof_url: string | null;
  estimated_delivery: string | null;
  delivered_at: string | null;
  created_at: string;
  cancel_reason?: string;
  // Joined fields
  pharmacy?: Pharmacy;
  address?: Address;
  courier?: User;
  user?: User;
  customer?: User;
}

export interface RequestStatusLog {
  id: string;
  request_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

// Helper type for pharmacy with calculated distance
export interface PharmacyWithDistance extends Pharmacy {
  distance_km: number;
}

// Status display config
export const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: string; icon: string; description: string }
> = {
  pending: {
    label: "Menunggu Konfirmasi",
    color: "text-amber-600 bg-amber-50",
    icon: "⏳",
    description: "Apotek belum mengkonfirmasi request Anda",
  },
  confirmed: {
    label: "Dikonfirmasi",
    color: "text-blue-600 bg-blue-50",
    icon: "✅",
    description: "Apotek sudah mengkonfirmasi, menunggu kurir",
  },
  courier_assigned: {
    label: "Kurir Ditugaskan",
    color: "text-indigo-600 bg-indigo-50",
    icon: "🚴",
    description: "Kurir sudah ditugaskan untuk mengantar obat Anda",
  },
  picked_up: {
    label: "Obat Diambil",
    color: "text-purple-600 bg-purple-50",
    icon: "📦",
    description: "Kurir sudah mengambil obat di apotek",
  },
  on_delivery: {
    label: "Sedang Diantar",
    color: "text-cyan-600 bg-cyan-50",
    icon: "🛵",
    description: "Kurir sedang dalam perjalanan ke alamat Anda",
  },
  delivered: {
    label: "Terkirim",
    color: "text-emerald-600 bg-emerald-50",
    icon: "🎉",
    description: "Obat sudah sampai di tujuan",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "text-red-600 bg-red-50",
    icon: "❌",
    description: "Permintaan pengiriman dibatalkan",
  },
};
