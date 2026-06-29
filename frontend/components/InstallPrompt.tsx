'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

// Custom iOS Safari Share Icon SVG
const SafariShareIcon = () => (
  <svg className="w-5 h-5 inline-block mx-1 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="9" width="14" height="11" rx="2" />
    <path d="M12 15V3m0 0L8 7m4-4l4 4" />
  </svg>
);

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    if (ios) {
      // On iOS, we show the prompt directly with instructions because beforeinstallprompt is not supported
      setIsInstallable(true);
    } else {
      // On Android / Desktop browsers supporting beforeinstallprompt
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-96 animate-in slide-in-from-bottom-5">
      <div className="rounded-xl border border-primary/20 bg-card text-card-foreground shadow-lg">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-semibold text-foreground">Install AmbilObat</h4>
              <p className="text-xs text-muted-foreground">
                Install aplikasi ini di perangkat Anda untuk akses lebih cepat dan mudah.
              </p>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setIsDismissed(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Tutup</span>
            </Button>
          </div>

          {isIOS ? (
            // iOS Instructions
            <div className="text-[11px] border-t border-border/50 pt-2 text-muted-foreground">
              Ketuk ikon share <SafariShareIcon /> di bawah Safari, lalu pilih <span className="font-semibold text-foreground">"Tambah ke Layar Utama"</span>.
            </div>
          ) : (
            // Android/Desktop Button
            <div className="flex justify-end border-t border-border/50 pt-2">
              <Button size="sm" onClick={handleInstallClick} className="w-full sm:w-auto whitespace-nowrap">
                <Download className="w-4 h-4 mr-1.5" />
                Install Aplikasi
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
