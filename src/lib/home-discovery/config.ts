import type { StepOption } from "@/types/discovery";

/**
 * Configuração central do fluxo emocional da Home.
 *
 * Todo valor técnico enviado para `get_recommendation_cards_v3` (atmosfera,
 * companhia, intenção) vive só aqui, como o próprio `id` de cada opção —
 * nenhum outro arquivo deve espalhar essas strings técnicas.
 *
 * Os valores seguem o mesmo vocabulário (minúsculo, sem acento, hífen entre
 * palavras) já usado nos dados reais de `public.venues.intentions` no
 * Supabase (ex.: "happy-hour", "encontro-romantico").
 */

/** Pergunta inicial da Home, sorteada a cada carregamento — nunca sempre a mesma. */
export const HOME_QUESTIONS: string[] = [
  "Como você quer se sentir hoje?",
  "Qual sensação você procura?",
  "O que você quer fazer agora?",
  "Qual aventura vamos viver hoje?",
  "Que tipo de memória vamos criar hoje?",
  "O que seu momento está pedindo?",
  "Qual é a boa para hoje?",
];

/** Sensação do momento — enviada como `p_atmosphere`. */
export const SENSATION_OPTIONS: StepOption[] = [
  { id: "romantico", label: "Romântico" },
  { id: "tranquilo", label: "Relaxar" },
  { id: "animado", label: "Curtir e se divertir" },
  { id: "comemorar", label: "Comemorar" },
  { id: "agito", label: "Agito" },
  { id: "natureza", label: "Natureza" },
  { id: "sofisticado", label: "Sofisticação" },
  { id: "social", label: "Rir e socializar" },
  { id: "novidade", label: "Descobrir algo novo" },
];

/** Com quem a pessoa vai — enviada como `p_companion`. */
export const COMPANION_OPTIONS: StepOption[] = [
  { id: "sozinho", label: "Sozinho" },
  { id: "casal", label: "Casal" },
  { id: "amigos", label: "Amigos" },
  { id: "familia", label: "Família" },
  { id: "criancas", label: "Crianças" },
  { id: "grupo", label: "Grupo" },
];

/** O que a pessoa quer viver — enviada como `p_intention`. */
export const INTENTION_OPTIONS: StepOption[] = [
  { id: "encontro-romantico", label: "Encontro romântico" },
  { id: "jantar", label: "Jantar" },
  { id: "happy-hour", label: "Happy hour" },
  { id: "comemorar", label: "Comemorar" },
  { id: "ouvir-musica", label: "Ouvir música" },
  { id: "comer-bem", label: "Comer bem" },
  { id: "conhecer-lugar-novo", label: "Conhecer lugar novo" },
  { id: "relaxar", label: "Relaxar" },
  { id: "experiencia-gastronomica", label: "Experiência gastronômica" },
];

/** Cidade inicial sugerida — o campo continua livre para qualquer outra cidade. */
export const DEFAULT_CITY = "São José dos Campos";
