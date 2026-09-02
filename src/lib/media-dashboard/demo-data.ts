import type { Venue } from "@/data/venues";
import type { VenueMedia } from "./types";

/**
 * Mídias de demonstração do Painel de Mídias.
 *
 * Só a Garagem do Espeto (o estabelecimento inicial deste protótipo) recebe
 * itens de exemplo; os demais estabelecimentos aparecem sem nenhum vídeo
 * cadastrado, já que servem apenas para demonstrar a troca de estabelecimento
 * do administrador. Nada aqui é persistido — é só o estado inicial da página.
 */

const GARAGEM_SLUG = "garagem-do-espeto";

export function buildDemoMedia(venue: Venue): VenueMedia[] {
  if (venue.id !== GARAGEM_SLUG) return [];

  const items: VenueMedia[] = [];

  if (venue.videoUrl) {
    items.push({
      id: `${venue.id}-video-principal`,
      title: "Vídeo principal do salão",
      origin: "painel",
      status: "published",
      isPrimary: true,
      uploadedAt: venue.updatedAt,
      uploadedBy: "Proprietário do estabelecimento",
      gradient: venue.gradient,
      videoUrl: venue.videoUrl,
    });
  }

  items.push(
    {
      id: `${venue.id}-demo-instagram`,
      title: "Clipe do balcão de atendimento",
      origin: "instagram",
      status: "pending",
      isPrimary: items.length === 0,
      uploadedAt: "2026-07-15",
      uploadedBy: "Importação do Instagram",
      gradient: venue.gradient,
    },
    {
      id: `${venue.id}-demo-admin`,
      title: "Making of da cozinha",
      origin: "admin",
      status: "hidden",
      isPrimary: false,
      uploadedAt: "2026-07-10",
      uploadedBy: "Equipe Bora pra onde",
      gradient: venue.gradient,
    },
  );

  return items;
}
