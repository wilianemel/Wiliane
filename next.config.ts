import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite testar o servidor de desenvolvimento a partir de outro
  // dispositivo na mesma rede local (ex.: celular via IP do Wi-Fi) — sem
  // isso, o Next.js bloqueia recursos de dev (HMR/runtime) vindos de uma
  // origem diferente de localhost, o que pode impedir a hidratação
  // completa do JavaScript no cliente. Só afeta `next dev`; não existe em
  // `next build`/`next start`.
  allowedDevOrigins: ["192.168.15.4"],
  images: {
    // Mídia real de estabelecimentos (capa, logo, galeria) vem do Supabase
    // Storage — sem isso, next/image recusa otimizar imagens de um host não
    // configurado. Só o hostname público, nenhum segredo aqui.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
