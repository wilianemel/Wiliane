/**
 * Tipos do protótipo do Painel de Mídias.
 *
 * Nesta etapa não há autenticação real nem persistência: `role` é escolhido
 * localmente na página só para simular as duas experiências (dono do
 * estabelecimento e equipe do Qual é a Boa).
 */

export type DashboardRole = "admin" | "owner";

export type MediaOrigin = "painel" | "instagram" | "admin";

export type MediaStatus = "published" | "pending" | "hidden";

export interface VenueMedia {
  id: string;
  title: string;
  origin: MediaOrigin;
  status: MediaStatus;
  isPrimary: boolean;
  /** Data de referência, formato "AAAA-MM-DD". */
  uploadedAt: string;
  uploadedBy: string;
  /** Gradiente reaproveitado do estabelecimento como área reservada, quando não há vídeo real. */
  gradient: string;
  /** Só preenchido quando existe um vídeo real disponível para pré-visualização. */
  videoUrl?: string;
}
