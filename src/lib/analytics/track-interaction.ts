import { createClient } from "@/lib/supabase/client";
import { getAnonymousId } from "./anonymous-id";

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
  /** Ausente/`undefined` para visitante anônimo — a função usa anonymous_id nesse caso. */
  userId?: string | null;
  /** Ausente para eventos sem estabelecimento associado (ex.: "search"). */
  venueId?: string | null;
  type: TrackedInteractionType;
  /** Payload livre do evento (ex.: termo pesquisado, contexto). */
  metadata?: Record<string, unknown>;
}

/**
 * Registra um evento comportamental em `public.user_interactions` —
 * best-effort, nunca lança e nunca quebra a experiência do usuário. Falhas
 * (rede, RLS, ou o enum/colunas ainda não terem sido estendidos pelas
 * migrations 017/019/023) são só logadas no console, nunca propagadas.
 *
 * Decide sozinho quem está gerando o evento — cada chamador só passa
 * `userId` quando existe uma sessão; sem `userId`, usa o identificador
 * anônimo local (ver anonymous-id.ts). Nenhum componente precisa
 * implementar essa decisão.
 */
export async function trackInteraction({
  userId,
  venueId,
  type,
  metadata,
}: TrackInteractionParams): Promise<void> {
  try {
    const anonymousId = userId ? null : getAnonymousId();

    if (!userId && !anonymousId) {
      // Sem sessão e sem identificador anônimo disponível (localStorage
      // indisponível) — não há como satisfazer a constraint de identidade
      // da tabela, nada a gravar.
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("user_interactions").insert({
      user_id: userId ?? null,
      anonymous_id: anonymousId,
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
