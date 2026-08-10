import { createClient } from "@/lib/supabase/client";
import type { DiscoveryAnswers, MatchResult } from "@/types/discovery";

interface SaveRecommendationHistoryParams {
  userId: string;
  results: MatchResult[];
  answers: DiscoveryAnswers;
}

export interface RecommendationHistoryLink {
  venueId: string;
  recommendationHistoryId: string;
}

/**
 * Salva o histórico das recomendações geradas pelo HomeMatchFlow — uma
 * linha por estabelecimento recomendado. Best-effort: nunca lança, nunca
 * bloqueia a tela; qualquer falha é só logada no console.
 *
 * A tabela real em produção (auditada em 2026-08-08) não tem colunas
 * dedicadas para score/reasons/context — só `recommendation_context jsonb`.
 * Os três valores vão todos ali dentro, como um único objeto.
 *
 * `result.venue.id` é o slug (ver mapVenueRow em venue-mapper.ts) — a FK
 * para venues(id) exige o UUID real, guardado em `result.venue.venueId`.
 * Estabelecimentos de demonstração locais (venueId vazio, sem linha real no
 * banco) são ignorados aqui, mesma regra já usada em favorites/tracking.
 *
 * Retorna o vínculo venue_id → id da linha criada (para o botão de
 * feedback saber em qual linha gravar depois). Best-effort: nunca lança;
 * em qualquer falha retorna `[]`, sem quebrar a tela de resultados.
 */
export async function saveRecommendationHistory({
  userId,
  results,
  answers,
}: SaveRecommendationHistoryParams): Promise<RecommendationHistoryLink[]> {
  const rows = results
    .filter((result) => result.venue.venueId)
    .map((result) => ({
      user_id: userId,
      venue_id: result.venue.venueId,
      recommendation_context: {
        score: result.score,
        reasons: result.reasons,
        answers,
      },
    }));

  if (rows.length === 0) return [];

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("recommendation_history")
      .insert(rows)
      .select("id, venue_id");

    if (error) {
      console.error("SAVE RECOMMENDATION HISTORY ERROR:", error);
      return [];
    }

    return (data ?? []).map((row) => ({
      venueId: row.venue_id as string,
      recommendationHistoryId: row.id as string,
    }));
  } catch (error) {
    console.error("SAVE RECOMMENDATION HISTORY ERROR:", error);
    return [];
  }
}
