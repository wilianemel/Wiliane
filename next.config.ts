import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
