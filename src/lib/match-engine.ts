import type { Venue } from "@/data/venues";
import type {
  AtmosphereId,
  DiscoveryAnswers,
  IntentionId,
  MatchResult,
  MusicPreferenceId,
} from "@/types/discovery";

/**
 * Motor de afinidade determinístico.
 *
 * Não há IA nem chamadas externas: a pontuação é sempre recalculada a
 * partir das respostas do usuário e dos dados de demonstração em
 * `src/data/venues.ts`. As mesmas respostas sempre produzem o mesmo
 * resultado (nenhuma parte do cálculo usa `Math.random` ou qualquer
 * outra fonte não determinística).
 */

export const MAX_RESULTS = 3;

/** Pesos máximos por critério. A soma padrão é 100 pontos. */
const WEIGHTS = {
  intention: 30,
  /** Peso reduzido da intenção quando o usuário escolhe "Surpreenda-me". */
  intentionSurprise: 10,
  companion: 20,
  atmosphere: 15,
  budget: 15,
  music: 10,
  distance: 5,
  confidence: 5,
} as const;

/**
 * Um local custando mais do que este múltiplo do orçamento informado é
 * eliminado da lista de recomendações, em vez de apenas perder pontos.
 */
const OVER_BUDGET_ELIMINATION_RATIO = 1.5;

const INTENTION_REASONS: Record<IntentionId, string> = {
  casal: "Combina com um momento a dois.",
  familia: "Pensado para reunir a família.",
  amigos: "Ótimo para curtir com os amigos.",
  "musica-ao-vivo": "Tem programação de música ao vivo.",
  relaxar: "Ambiente pensado para relaxar.",
  comemorar: "Ideal para comemorar uma data especial.",
  novidade: "Uma experiência diferente da rotina.",
  surpreenda: "Foi escolhido para trazer uma experiência variada e surpreendente.",
};

const COMPANION_REASONS: Record<string, string> = {
  sozinho: "Funciona bem para ir sozinho(a).",
  casal: "Combina com quem vai a dois.",
  familia: "Preparado para receber famílias.",
  amigos: "Combina com uma saída entre amigos.",
};

const ATMOSPHERE_LABELS: Record<AtmosphereId, string> = {
  tranquilo: "tranquilo",
  animado: "animado",
  romantico: "romântico",
  familiar: "familiar",
  sofisticado: "sofisticado",
  casual: "casual",
};

const MUSIC_LABELS: Partial<Record<MusicPreferenceId, string>> = {
  rock: "rock",
  mpb: "MPB",
  sertanejo: "sertanejo",
  eletronica: "eletrônica",
  ambiente: "música ambiente",
};

/** Locais fechados, comprovadamente fora da distância ou muito acima do orçamento não aparecem. */
function isEligible(venue: Venue, answers: DiscoveryAnswers): boolean {
  if (!venue.openNow) return false;

  if (
    answers.distanceMax !== null &&
    venue.distanceKm !== null &&
    venue.distanceKm > answers.distanceMax
  ) {
    return false;
  }
  // Distância desconhecida (distance_km nulo, comum nos estabelecimentos
  // reais ainda sem geolocalização) não elimina o local — só não pontua por
  // proximidade em scoreDistance() nem aparece com um valor inventado. Sem
  // essa regra, qualquer filtro de distância zerava os resultados reais.

  if (
    answers.budgetMax !== null &&
    venue.averagePricePerPerson > answers.budgetMax * OVER_BUDGET_ELIMINATION_RATIO
  ) {
    return false;
  }

  return true;
}

function scoreIntention(
  venue: Venue,
  answers: DiscoveryAnswers,
  maxIntentionBreadth: number,
): number {
  if (!answers.intention) return 0;

  if (answers.intention === "surpreenda") {
    if (maxIntentionBreadth === 0) return 0;
    return (venue.intentions.length / maxIntentionBreadth) * WEIGHTS.intentionSurprise;
  }

  return venue.intentions.includes(answers.intention) ? WEIGHTS.intention : 0;
}

function scoreCompanion(venue: Venue, answers: DiscoveryAnswers): number {
  if (!answers.companion) return 0;
  return venue.companions.includes(answers.companion) ? WEIGHTS.companion : 0;
}

function scoreAtmosphere(venue: Venue, answers: DiscoveryAnswers): number {
  if (!answers.atmosphere) return 0;
  return venue.atmospheres.includes(answers.atmosphere) ? WEIGHTS.atmosphere : 0;
}

/** Dentro do orçamento pontua cheio; acima, perde pontos proporcionalmente ao excedente. */
function scoreBudget(venue: Venue, answers: DiscoveryAnswers): number {
  if (answers.budgetMax === null) return WEIGHTS.budget;
  if (venue.averagePricePerPerson <= answers.budgetMax) return WEIGHTS.budget;

  const overageRatio =
    (venue.averagePricePerPerson - answers.budgetMax) / answers.budgetMax;
  const remainingRatio = Math.max(0, 1 - overageRatio);
  return WEIGHTS.budget * remainingRatio;
}

/** "Sem preferência" nunca penaliza; um estilo específico só pontua se o local o oferece. */
function scoreMusic(venue: Venue, answers: DiscoveryAnswers): number {
  if (answers.music === "sem-preferencia") return WEIGHTS.music;
  return venue.musicStyles.includes(answers.music) ? WEIGHTS.music : 0;
}

/** Quanto mais perto do limite aceito, maior a pontuação de distância. */
function scoreDistance(venue: Venue, answers: DiscoveryAnswers): number {
  // Distância desconhecida nunca pontua por proximidade — nem para mais,
  // nem para menos.
  if (venue.distanceKm === null) return 0;

  if (answers.distanceMax === null || answers.distanceMax <= 0) {
    return WEIGHTS.distance;
  }

  const proximityRatio = Math.max(0, 1 - venue.distanceKm / answers.distanceMax);
  return WEIGHTS.distance * proximityRatio;
}

function scoreConfidence(venue: Venue): number {
  return WEIGHTS.confidence * (venue.dataConfidence / 100);
}

/** Gera de 2 a 4 motivos, usando somente atributos reais do estabelecimento. */
function buildReasons(venue: Venue, answers: DiscoveryAnswers): string[] {
  const reasons: string[] = [];

  if (answers.intention === "surpreenda") {
    reasons.push(INTENTION_REASONS.surpreenda);
  } else if (answers.intention && venue.intentions.includes(answers.intention)) {
    reasons.push(INTENTION_REASONS[answers.intention]);
  }

  if (answers.companion && venue.companions.includes(answers.companion)) {
    reasons.push(COMPANION_REASONS[answers.companion]);
  }

  if (answers.atmosphere && venue.atmospheres.includes(answers.atmosphere)) {
    reasons.push(`O ambiente foi classificado como ${ATMOSPHERE_LABELS[answers.atmosphere]}.`);
  }

  if (answers.music !== "sem-preferencia" && venue.musicStyles.includes(answers.music)) {
    reasons.push(`Possui programação de ${MUSIC_LABELS[answers.music]}.`);
  }

  if (answers.budgetMax !== null) {
    reasons.push(
      venue.averagePricePerPerson <= answers.budgetMax
        ? "Está dentro do orçamento informado."
        : "Fica próximo do orçamento informado.",
    );
  }

  if (venue.distanceKm !== null) {
    reasons.push(`Fica a ${venue.distanceKm.toFixed(1).replace(".", ",")} km.`);
  }

  if (venue.dataConfidence >= 90) {
    reasons.push("As informações foram verificadas recentemente.");
  }

  return reasons.slice(0, 4);
}

/**
 * Avalia os estabelecimentos elegíveis, calcula uma pontuação de 0 a 100
 * para cada um e retorna, no máximo, `MAX_RESULTS` deles, ordenados do
 * mais para o menos compatível.
 */
export function getRecommendations(
  answers: DiscoveryAnswers,
  candidateVenues: Venue[],
): MatchResult[] {
  const eligibleVenues = candidateVenues.filter((venue) => isEligible(venue, answers));

  const maxIntentionBreadth = eligibleVenues.reduce(
    (max, venue) => Math.max(max, venue.intentions.length),
    0,
  );

  const results: MatchResult[] = eligibleVenues.map((venue) => {
    const rawScore =
      scoreIntention(venue, answers, maxIntentionBreadth) +
      scoreCompanion(venue, answers) +
      scoreAtmosphere(venue, answers) +
      scoreBudget(venue, answers) +
      scoreMusic(venue, answers) +
      scoreDistance(venue, answers) +
      scoreConfidence(venue);

    return {
      venue,
      score: Math.round(Math.min(100, Math.max(0, rawScore))),
      reasons: buildReasons(venue, answers),
    };
  });

  return results
    .sort((a, b) => b.score - a.score || a.venue.name.localeCompare(b.venue.name))
    .slice(0, MAX_RESULTS);
}
