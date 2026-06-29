import { Geist } from "next/font/google";
import type { Metadata, Viewport } from "next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import PwaRegister from "@/components/PwaRegister";
import { NotificationProvider } from "@/components/NotificationProvider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Sobat — Antar Obat ke Rumah",
    template: "%s | Sobat",
  },
  description:
    "Layanan antar obat dari apotek ke rumah Anda. Cukup masukkan nomor obat, obat diantar oleh kurir apotek.",
  keywords: ["antar obat", "apotek", "delivery", "obat", "kesehatan"],
  authors: [{ name: "Sobat" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "light",
  themeColor: "#f0fdf4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={cn("antialiased", geist.variable, "font-sans")}>
      <body className="min-h-svh">
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </AuthProvider>
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
