'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { subscribeUserToPush } from '@/lib/push-notification';
import { Bell, BellOff, X, Pill, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationContextType {
  requestPushPermission: () => Promise<void>;
  permissionStatus: NotificationPermission | 'unsupported';
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface ToastMessage {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Update permission status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('Notification' in window)) {
        setPermissionStatus('unsupported');
      } else {
        setPermissionStatus(Notification.permission);
        if (Notification.permission === 'default' && user) {
          // Show banner after 3 seconds if permission is not set and user is logged in
          const timer = setTimeout(() => setShowPermissionBanner(true), 3000);
          return () => clearTimeout(timer);
        }
        
        // Auto-sync subscription if permission is already granted and user is logged in
        if (Notification.permission === 'granted' && user) {
          subscribeUserToPush(user.id);
        }
      }
    }
  }, [user]);

  // Supabase Realtime listener for transaction updates
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    // Subscribe to changes on delivery_requests table for this user
    const channel = supabase
      .channel(`delivery-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newRequest = payload.new as any;
          const oldRequest = payload.old as any;

          if (newRequest.status !== oldRequest.status) {
            triggerInAppToast(newRequest.status, newRequest.request_number);
            
            // Trigger browser notification if app is open but tab is unfocused (using Service Worker for mobile compatibility)
            if (document.hidden && Notification.permission === 'granted') {
              const info = getStatusInfo(newRequest.status);
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                  reg.showNotification(info.title, {
                    body: `${info.body} (No: ${newRequest.request_number})`,
                    icon: '/icon-192x192.png',
                    badge: '/icon-144x144.png',
                    data: {
                      url: `/orders/${newRequest.id}`
                    }
                  });
                });
              } else {
                new Notification(info.title, {
                  body: `${info.body} (No: ${newRequest.request_number})`,
                  icon: '/icon-192x192.png',
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { title: 'Pesanan Dibuat', body: 'Menunggu konfirmasi apotek.', type: 'info' as const };
      case 'confirmed':
        return { title: 'Pesanan Dikonfirmasi', body: 'Apotek sedang menyiapkan obat Anda.', type: 'info' as const };
      case 'courier_assigned':
        return { title: 'Kurir Ditugaskan', body: 'Kurir telah ditugaskan untuk mengambil obat.', type: 'info' as const };
      case 'picked_up':
        return { title: 'Obat Diambil', body: 'Kurir telah mengambil obat dari apotek.', type: 'info' as const };
      case 'on_delivery':
        return { title: 'Sedang Diantar', body: 'Kurir sedang dalam perjalanan ke alamat Anda.', type: 'warning' as const };
      case 'delivered':
        return { title: 'Obat Diterima', body: 'Pesanan obat Anda telah selesai diantar.', type: 'success' as const };
      case 'cancelled':
        return { title: 'Pesanan Dibatalkan', body: 'Pesanan obat Anda telah dibatalkan.', type: 'error' as const };
      default:
        return { title: 'Pembaruan Transaksi', body: `Status pesanan Anda: ${status}`, type: 'info' as const };
    }
  };

  const triggerInAppToast = (status: string, requestNumber: string) => {
    const info = getStatusInfo(status);
    const id = Math.random().toString(36).substr(2, 9);
    
    setToasts((prev) => [
      ...prev,
      {
        id,
        title: info.title,
        body: `${info.body} (${requestNumber})`,
        type: info.type,
      },
    ]);

    // Play a gentle notification sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5 note
      osc.frequency.setValueAtTime(880.00, audioContext.currentTime + 0.1); // A5 note
      gain.gain.setValueAtTime(0.1, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Audio context block browser safety
    }

    // Auto-remove toast after 6 seconds
    setTimeout(() => {
      removeToast(id);
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      setShowPermissionBanner(false);

      if (permission === 'granted' && user) {
        await subscribeUserToPush(user.id);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'warning':
        return <Truck className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      default:
        return <Pill className="w-5 h-5 text-sky-500 shrink-0" />;
    }
  };

  return (
    <NotificationContext.Provider value={{ requestPushPermission, permissionStatus }}>
      {children}

      {/* Real-time In-App Toasts Stack */}
      <div className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 max-w-sm mx-auto sm:left-auto sm:right-4 sm:mx-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-start gap-3 p-4 rounded-xl border bg-card/95 text-card-foreground shadow-xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300"
          >
            {getToastIcon(toast.type)}
            <div className="flex-1 flex flex-col gap-0.5">
              <h5 className="text-xs font-semibold">{toast.title}</h5>
              <p className="text-[11px] text-muted-foreground leading-normal">{toast.body}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Permission Ask Banner */}
      {showPermissionBanner && (
        <div className="fixed bottom-20 left-4 right-4 z-40 md:bottom-6 md:left-6 md:right-auto md:w-96 animate-in slide-in-from-bottom-5">
          <div className="rounded-xl border border-primary/20 bg-card text-card-foreground p-4 shadow-lg flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary shrink-0" />
                <h4 className="text-xs font-semibold">Aktifkan Notifikasi Transaksi</h4>
              </div>
              <button 
                onClick={() => setShowPermissionBanner(false)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dapatkan pembaruan status pengiriman obat Anda secara instan di HP bahkan saat aplikasi ditutup.
            </p>
            <div className="flex gap-2 justify-end border-t border-border/50 pt-2.5">
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setShowPermissionBanner(false)}>
                Nanti saja
              </Button>
              <Button size="sm" className="h-7 text-[11px]" onClick={requestPushPermission}>
                Aktifkan
              </Button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
