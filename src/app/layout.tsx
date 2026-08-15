import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Qual é a Boa | Experiências escolhidas para você",
  description:
    "Descubra restaurantes, bares, eventos e experiências que combinam com o seu momento.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  // "cover" é o que faz env(safe-area-inset-*) resolver pra um valor real no
  // iPhone (notch/home indicator) — sem isso a bottom nav (BottomNav) fica
  // sempre com padding-bottom: 0, mesmo no CSS já preparado pra safe-area.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
