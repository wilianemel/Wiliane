import { createClient } from "@/lib/supabase/client";
import type { RecommendationCard } from "./types";

interface GetRecommendationCardsParams {
  city: string;
  atmosphere: string;
  companion: string;
  intention: string;
}

/**
 * Chama `get_recommendation_cards_v3` no Supabase (dados reais, sem cálculo
 * local). Deixa o chamador decidir como tratar o erro — aqui só repassamos.
 */
export async function getRecommendationCards({
  city,
  atmosphere,
  companion,
  intention,
}: GetRecommendationCardsParams): Promise<RecommendationCard[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_recommendation_cards_v3", {
    p_city: city,
    p_atmosphere: atmosphere,
    p_companion: companion,
    p_intention: intention,
  });

  if (error) throw error;

  // Sem geração de tipos via Supabase CLI ainda; validação de formato fica
  // a cargo do mapeamento na UI, que já trata cada campo como opcionalmente nulo.
  return (data ?? []) as unknown as RecommendationCard[];
}
