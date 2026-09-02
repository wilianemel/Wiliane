import type { MetadataRoute } from "next";

/**
 * Convenção de arquivo do App Router: gera /manifest.webmanifest
 * automaticamente e injeta <link rel="manifest"> no <head> — nenhuma tag
 * manual necessária. Ícones reais (gerados a partir de public/brand/,
 * nunca placeholder): 192/512 padrão para Android, 512 maskable (logo
 * reduzido para caber na safe zone antes de recortes circulares/squircle do
 * launcher) e apple-icon (180x180, convenção separada em src/app/apple-icon.png).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bora pra onde?",
    short_name: "Bora pra onde",
    description: "Encontre experiências que combinam com você.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0b",
    theme_color: "#ffc21e",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
