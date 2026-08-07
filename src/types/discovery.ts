import type { Venue } from "@/data/venues";
import type { VenueMomentTag } from "@/lib/venues/venue-tags";

export type IntentionId =
  | "casal"
  | "familia"
  | "amigos"
  | "musica-ao-vivo"
  | "relaxar"
  | "comemorar"
  | "novidade"
  | "surpreenda";

export type CompanionId = "sozinho" | "casal" | "familia" | "amigos";

export type AtmosphereId =
  | "tranquilo"
  | "animado"
  | "romantico"
  | "familiar"
  | "sofisticado"
  | "casual";

export type MusicPreferenceId =
  | "sem-preferencia"
  | "rock"
  | "mpb"
  | "sertanejo"
  | "eletronica"
  | "ambiente";

/** Respostas coletadas ao longo do fluxo de descoberta em `/descobrir`. */
export interface DiscoveryAnswers {
  intention: IntentionId | null;
  companion: CompanionId | null;
  /** Valor máximo de gasto por pessoa, em reais, para a faixa escolhida. */
  budgetMax: number | null;
  /** Distância máxima aceita, em quilômetros. */
  distanceMax: number | null;
  atmosphere: AtmosphereId | null;
  /** Preferência musical opcional; "sem-preferencia" nunca penaliza um local. */
  music: MusicPreferenceId;
  /** Melhor momento, opcional; `null` quando o usuário não responde e não penaliza nenhum local. */
  moment: VenueMomentTag | null;
}

export interface StepOption {
  id: string;
  label: string;
}

export interface BudgetOption extends StepOption {
  maxPerPerson: number;
}

export interface DistanceOption extends StepOption {
  maxKm: number;
}

/** Resultado de um estabelecimento avaliado pelo motor de afinidade. */
export interface MatchResult {
  venue: Venue;
  /** Pontuação de 0 a 100, calculada a partir das respostas do usuário. */
  score: number;
  /** De 2 a 4 motivos objetivos, derivados apenas de atributos reais do local. */
  reasons: string[];
}
