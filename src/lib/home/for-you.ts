import type { Venue } from "@/data/venues";
import { preferenceScore, type UserPreferencesRow } from "@/lib/user-intelligence/preference-score";

const MAX_FOR_YOU_VENUES = 10;

/**
 * Ranking da vitrine "Perfeito para você" da Home usando a MESMA função de
 * pontuação de preferência que já alimenta o bônus de personalização do
 * match-engine (preferenceScore, em preference-score.ts) — não reimplementa
 * a lógica de correspondência (categoria/atmosfera/companhia) aqui.
 * Não importa nem altera match-engine.ts; preferenceScore() já é uma
 * função pura e independente do motor, só compartilhada por ele.
 *
 * preferenceScore() já retorna score 0 (e nenhum motivo) sem preferências
 * declaradas ou sem nenhum sinal batendo — por isso o filtro
 * `entry.score > 0` abaixo já é suficiente para esconder a seção quando não
 * há personalização real, sem duplicar essa checagem aqui.
 */
export function getForYouVenues(venues: Venue[], preferences: UserPreferencesRow | null): Venue[] {
  if (!preferences) return [];

  return venues
    .map((venue) => ({ venue, score: preferenceScore({ userPreferences: preferences, venue }).score }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_FOR_YOU_VENUES)
    .map((entry) => entry.venue);
}
