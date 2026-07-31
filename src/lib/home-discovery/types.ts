/**
 * Formato de retorno de `public.get_recommendation_cards_v3` no Supabase.
 *
 * Campos de array/texto opcionais são tratados como possivelmente nulos —
 * a interface nunca deve quebrar por causa de um campo ausente vindo do banco.
 */
export interface RecommendationCard {
  venue_id: string;
  venue_name: string;
  match_score: number;
  headline: string | null;
  why_recommended: string | null;
  highlights: string[] | null;
  cuisine: string[] | null;
  price_range: string | null;
}

export interface HomeDiscoverySelection {
  sensation: string | null;
  companion: string | null;
  intention: string | null;
  city: string;
}
