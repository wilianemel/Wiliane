import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AppShell } from "@/components/app-shell";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";
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
  title: "Bora pra onde | Experiências escolhidas para você",
  description:
    "Descubra restaurantes, bares, eventos e experiências que combinam com o seu momento.",
  // PWA instalável (Etapa 1): manifest.ts e apple-icon.png já são
  // convenções de arquivo do App Router — injetam <link rel="manifest">
  // e <link rel="apple-touch-icon"> sozinhos, sem tag manual aqui.
  // appleWebApp cobre o que essas convenções não resolvem: habilita modo
  // standalone ao abrir da tela de início do iPhone (sem isso o Safari
  // sempre abre numa aba normal, mesmo com o app instalado) e usa
  // "black-translucent" para o conteúdo poder ocupar até embaixo da barra
  // de status — por isso o header precisa de padding-top com
  // env(safe-area-inset-top) (ver header.tsx) só nesse modo.
  appleWebApp: {
    capable: true,
    title: "Bora pra onde",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  // "cover" é o que faz env(safe-area-inset-*) resolver pra um valor real no
  // iPhone (notch/home indicator) — sem isso a bottom nav (BottomNav) fica
  // sempre com padding-bottom: 0, mesmo no CSS já preparado pra safe-area.
  viewportFit: "cover",
  // Cor da barra de status/UI do sistema quando o app está instalado
  // (Android) — mesmo tom do manifest.ts (theme_color), pra não haver
  // divergência entre o que o manifest promete e o que a página renderiza.
  themeColor: "#ffc21e",
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
        <ServiceWorkerRegister />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
