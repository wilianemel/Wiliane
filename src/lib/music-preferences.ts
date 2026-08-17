import type { MusicPreferenceId } from "@/types/discovery";

/**
 * Todos os valores válidos de MusicPreferenceId (tipo já existente em
 * types/discovery.ts, reaproveitado aqui, não redefinido), incluindo
 * "sem-preferencia" — usado pelo questionário/match-engine.
 */
export const MUSIC_PREFERENCE_IDS: MusicPreferenceId[] = [
  "sem-preferencia",
  "rock",
  "mpb",
  "sertanejo",
  "eletronica",
  "ambiente",
];

/**
 * Única fonte de verdade dos rótulos musicais — usada tanto pelos motivos
 * de recomendação do match-engine ("Possui programação de rock.") quanto
 * pela tela Minha vibe (que só ajusta a capitalização pra chip via
 * capitalizeMusicLabel(), sem duplicar o rótulo em si). Sem
 * "sem-preferencia" de propósito: nunca vira texto de "possui programação
 * de X.", e nunca é uma preferência pessoal real.
 */
export const MUSIC_PREFERENCE_LABELS: Partial<Record<MusicPreferenceId, string>> = {
  rock: "rock",
  mpb: "MPB",
  sertanejo: "sertanejo",
  eletronica: "eletrônica",
  ambiente: "música ambiente",
};

/**
 * Só os estilos reais, sem "sem-preferencia" — para telas onde ausência de
 * preferência não faz sentido como opção (ex.: Minha vibe).
 */
export const REAL_MUSIC_PREFERENCE_IDS: MusicPreferenceId[] = MUSIC_PREFERENCE_IDS.filter(
  (id) => id !== "sem-preferencia",
);

/**
 * Primeira letra maiúscula, preservando o resto do rótulo — não estraga
 * siglas como "MPB". Usada só pra exibição em chip (Minha vibe); o motivo
 * de recomendação do match-engine continua usando MUSIC_PREFERENCE_LABELS
 * direto, sem essa transformação, pra manter o texto exatamente como já
 * era.
 */
export function capitalizeMusicLabel(id: MusicPreferenceId): string {
  const label = MUSIC_PREFERENCE_LABELS[id] ?? id;
  return label.charAt(0).toUpperCase() + label.slice(1);
}
