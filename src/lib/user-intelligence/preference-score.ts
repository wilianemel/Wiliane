import type { Venue } from "@/data/venues";
import { ATMOSPHERE_TAG_LABELS } from "@/lib/venues/venue-tags";

/** Mesmo formato bruto da linha de `public.user_preferences`. */
export interface UserPreferencesRow {
  favorite_categories: string[] | null;
  favorite_atmospheres: string[] | null;
  preferred_companions: string[] | null;
  /**
   * Preferência musical declarada (Minha vibe) ou aprendida ao favoritar
   * (update-preferences.ts). Só o campo — nenhum bônus de música é
   * calculado ainda em preferenceScore(); isso fica para uma etapa
   * separada, depois de validar armazenamento/edição/aprendizado.
   */
  preferred_music_styles?: string[] | null;
}

export interface PreferenceScoreResult {
  /** Bônus adicional, somado ao score do motor antes do clamp final em 0-100. */
  score: number;
  /** No máximo 1 motivo por critério que bateu — a integração usa só o primeiro. */
  reasons: string[];
}

/** Bônus máximo por critério, aplicado só com confiança plena (ver CONFIDENCE_FULL_THRESHOLD). */
const MAX_BONUS = {
  category: 6,
  atmosphere: 4,
  companion: 4,
} as const;

/**
 * Soma de sinais (favorite_categories + favorite_atmospheres +
 * preferred_companions) a partir da qual o bônus vale 100% do máximo. Com
 * menos sinais que isso, o bônus é proporcionalmente menor — assim um
 * usuário com só 1 favorito não pesa tanto quanto um com histórico maior.
 */
const CONFIDENCE_FULL_THRESHOLD = 6;

function hasIntersection(a: string[], b: string[]): boolean {
  return a.some((value) => b.includes(value));
}

/**
 * Bônus de personalização a partir do histórico declarado do usuário
 * (`user_preferences`, hoje alimentado só por favoritos — ver
 * update-preferences.ts). Camada aditiva: sem preferências, retorna score 0
 * e nenhum motivo, então nunca altera o resultado de quem não tem histórico.
 */
export function preferenceScore({
  userPreferences,
  venue,
}: {
  userPreferences: UserPreferencesRow | null | undefined;
  venue: Venue;
}): PreferenceScoreResult {
  if (!userPreferences) {
    return { score: 0, reasons: [] };
  }

  const favoriteCategories = userPreferences.favorite_categories ?? [];
  const favoriteAtmospheres = userPreferences.favorite_atmospheres ?? [];
  const preferredCompanions = userPreferences.preferred_companions ?? [];

  const totalSignals = favoriteCategories.length + favoriteAtmospheres.length + preferredCompanions.length;
  if (totalSignals === 0) {
    return { score: 0, reasons: [] };
  }

  const confidence = Math.min(1, totalSignals / CONFIDENCE_FULL_THRESHOLD);

  let score = 0;
  const reasons: string[] = [];

  if (favoriteCategories.includes(venue.category)) {
    score += MAX_BONUS.category * confidence;
    reasons.push("Combina com lugares que você costuma gostar.");
  }

  const matchedAtmosphere = venue.atmospheres.find((atmosphere) =>
    favoriteAtmospheres.includes(atmosphere),
  );
  if (matchedAtmosphere) {
    score += MAX_BONUS.atmosphere * confidence;
    const label = ATMOSPHERE_TAG_LABELS[matchedAtmosphere] ?? matchedAtmosphere;
    reasons.push(`Você costuma escolher ambientes ${label}.`);
  }

  if (hasIntersection(venue.companions, preferredCompanions)) {
    score += MAX_BONUS.companion * confidence;
    reasons.push("Combina com a companhia que você costuma escolher.");
  }

  return { score, reasons };
}
