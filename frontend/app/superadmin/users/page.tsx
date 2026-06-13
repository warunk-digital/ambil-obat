"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, ShieldAlert, Store, AlertCircle, CheckCircle2 } from "lucide-react";
import type { User, Pharmacy, StaffRole } from "@/lib/types";

export default function SuperAdminUsersPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  
  // Assign Staff Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState("");
  const [selectedRole, setSelectedRole] = useState<StaffRole>("courier");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchData = async () => {
    setLoading(true);
    const [usersRes, pharmRes] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("pharmacies").select("id, name").order("name")
    ]);
    
    if (usersRes.data) setUsers(usersRes.data as User[]);
    if (pharmRes.data) setPharmacies(pharmRes.data as Pharmacy[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAssignModal = (user: User) => {
    setSelectedUser(user);
    setMessage({ type: "", text: "" });
    setShowModal(true);
  };

  const handleAssignStaff = async () => {
    if (!selectedUser || !selectedPharmacy) return;
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    // Menggunakan upsert agar otomatis update jika sudah ada, mencegah error duplicate key
    const { error } = await supabase
      .from("pharmacy_staff")
      .upsert(
        { 
          user_id: selectedUser.id, 
          pharmacy_id: selectedPharmacy, 
          staff_role: selectedRole,
          is_active: true
        },
        { onConflict: "user_id,pharmacy_id" }
      );

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      // Sync global role in users table
      const globalRole = selectedRole === "admin" || selectedRole === "owner" ? "admin" : "customer";
      await supabase
        .from("users")
        .update({ role: globalRole })
        .eq("id", selectedUser.id);

      setMessage({ type: "success", text: `Berhasil menugaskan ${selectedUser.full_name} sebagai ${selectedRole}.` });
      fetchData(); // Refresh list to show updated role
      setTimeout(() => setShowModal(false), 2000);
    }
    setSubmitting(false);
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Pengguna</h1>
        <p className="text-sm text-slate-500">Kelola pengguna dan berikan akses staf apotek</p>
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Nama Pengguna</th>
                <th className="px-6 py-4 font-semibold">Kontak</th>
                <th className="px-6 py-4 font-semibold">Role Global</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{u.full_name}</p>
                        <p className="text-[10px] text-slate-400">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{u.phone || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'super_admin' ? 'bg-rose-100 text-rose-700' : 
                      u.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openAssignModal(u)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Jadikan Staf Apotek
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View (Cards) */}
      <div className="grid gap-4 md:hidden">
        {users.map((u) => (
          <div key={u.id} className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold shadow-inner">
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 line-clamp-1">{u.full_name}</p>
                  <p className="text-xs text-slate-500">{u.phone || "Tidak ada nomor"}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                u.role === 'super_admin' ? 'bg-rose-100/80 text-rose-700' : 
                u.role === 'admin' ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-100/80 text-slate-600'
              }`}>
                {u.role}
              </span>
            </div>
            
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 truncate max-w-[50%]">{u.id.substring(0,18)}...</p>
              <button
                onClick={() => openAssignModal(u)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-100 bg-rose-50/80 px-4 py-2 rounded-xl transition-colors backdrop-blur-sm"
              >
                Atur Staf
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold">Jadikan Staf Apotek</h3>
            <p className="mb-4 text-sm text-slate-500">Pilih apotek dan peran untuk {selectedUser.full_name}</p>

            {message.text && (
              <div className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Apotek</label>
                <select
                  value={selectedPharmacy}
                  onChange={(e) => setSelectedPharmacy(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
                >
                  <option value="">-- Pilih Apotek --</option>
                  {pharmacies.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Peran (Role)</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as StaffRole)}
                  className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
                >
                  <option value="admin">Admin Apotek</option>
                  <option value="courier">Kurir</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleAssignStaff}
                disabled={submitting || !selectedPharmacy}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Tugaskan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
