import { createClient } from "@/lib/supabase/client";

/**
 * Vocabulário novo (inglês, snake_case) para a camada de tracking
 * comportamental. Deliberadamente separado do vocabulário existente em
 * `public.interaction_type` (visualizou/salvou/favoritou/ignorou/visitou,
 * usado hoje só pela RPC `register_user_interaction` em
 * `home-discovery/register-interaction.ts`) — os dois convivem no mesmo
 * enum (ver 017_extend_user_interactions_for_tracking.sql) sem que um
 * afete o outro.
 */
export type TrackedInteractionType =
  | "venue_view"
  | "favorite_added"
  | "favorite_removed"
  | "search"
  | "whatsapp_click"
  | "route_click"
  | "reservation_click";

export interface TrackInteractionParams {
  userId: string;
  /** Ausente para eventos sem estabelecimento associado (ex.: "search"). */
  venueId?: string | null;
  type: TrackedInteractionType;
  /** Payload livre do evento (ex.: termo pesquisado, contexto). */
  metadata?: Record<string, unknown>;
}

/**
 * Registra um evento comportamental em `public.user_interactions` —
 * best-effort, nunca lança e nunca quebra a experiência do usuário. Falhas
 * (rede, RLS, ou o enum ainda não ter sido estendido pelas migrations 017
 * e 019) são só logadas no console, nunca propagadas.
 */
export async function trackInteraction({
  userId,
  venueId,
  type,
  metadata,
}: TrackInteractionParams): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("user_interactions").insert({
      user_id: userId,
      venue_id: venueId ?? null,
      interaction_type: type,
      metadata: metadata ?? null,
    });

    if (error) {
      console.error("TRACK INTERACTION ERROR:", error);
    }
  } catch (error) {
    console.error("TRACK INTERACTION ERROR:", error);
  }
}
