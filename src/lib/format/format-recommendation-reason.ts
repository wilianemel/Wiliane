import { humanizeSlugsInText } from "./humanize-slug";

/**
 * "Por que essa recomendação" chega pronto de `get_recommendation_cards_v3`
 * (função do Supabase que não alteramos) sempre no mesmo molde mecânico:
 * "Combina com você porque une {atmosfera}, {companhia} e uma experiência
 * de {intenção}." — com os valores técnicos que o Home enviou como
 * parâmetro inseridos ao vivo na frase (ex.: "conhecer-lugar-novo").
 *
 * Como a RPC não pode ser tocada, reescrevemos esse texto aqui, no
 * cliente: reconhecemos o molde conhecido, extraímos os três valores reais
 * já retornados (nenhum dado novo é inventado) e montamos uma frase
 * natural com eles. As três listas abaixo só existem para dar um fraseado
 * gramatical correto (artigo, plural, gênero) a cada valor — os valores em
 * si são o mesmo vocabulário técnico já usado em
 * `src/lib/home-discovery/config.ts` para os parâmetros da RPC.
 *
 * Texto fora desse molde, ou algum dos três valores fora deste vocabulário
 * conhecido, nunca é editado à força: cai no fallback seguro
 * (humanizeSlugsInText), que só limpa hífens técnicos sem reescrever nada
 * e nunca esconde informação.
 */

const MECHANICAL_PATTERN =
  /^combina com você porque une\s+(.+?),\s*(.+?)\s+e uma experiência de\s+(.+?)\.?\s*$/i;

const ATMOSPHERE_PHRASES: Record<string, string> = {
  romantico: "um ambiente romântico",
  tranquilo: "um ambiente tranquilo",
  animado: "um ambiente animado",
  comemorar: "um ambiente ideal para comemorar",
  agito: "um ambiente agitado",
  natureza: "contato com a natureza",
  sofisticado: "um ambiente sofisticado",
  social: "um ambiente descontraído para socializar",
  novidade: "uma experiência diferente do habitual",
};

const COMPANION_PHRASES: Record<string, string> = {
  sozinho: "momentos a sós",
  casal: "um momento a dois",
  amigos: "encontros com amigos",
  familia: "toda a família",
  criancas: "passeios com crianças",
  grupo: "grupos maiores",
};

const INTENTION_PHRASES: Record<string, string> = {
  "encontro-romantico": "um encontro romântico",
  jantar: "um bom jantar",
  "happy-hour": "um happy hour animado",
  comemorar: "um momento de comemoração",
  "ouvir-musica": "uma boa trilha sonora ao vivo",
  "comer-bem": "uma boa gastronomia",
  "conhecer-lugar-novo": "a chance de conhecer um lugar novo",
  relaxar: "um momento para relaxar",
  "experiencia-gastronomica": "uma experiência gastronômica completa",
};

function resolvePhrase(rawValue: string, phrases: Record<string, string>): string | null {
  return phrases[rawValue.trim().toLowerCase()] ?? null;
}

/**
 * Formata um texto de "motivo da recomendação" em português natural.
 * Seguro para qualquer entrada: nulo/vazio vira string vazia, texto fora
 * do molde conhecido (ex.: as frases já naturais do motor local de
 * `/descobrir`) passa praticamente inalterado.
 */
export function formatRecommendationReason(rawText: string | null | undefined): string {
  if (!rawText) return "";

  const match = rawText.match(MECHANICAL_PATTERN);
  if (!match) return humanizeSlugsInText(rawText);

  const [, atmosphereRaw, companionRaw, intentionRaw] = match;
  const atmosphere = resolvePhrase(atmosphereRaw, ATMOSPHERE_PHRASES);
  const companion = resolvePhrase(companionRaw, COMPANION_PHRASES);
  const intention = resolvePhrase(intentionRaw, INTENTION_PHRASES);

  if (!atmosphere || !companion || !intention) {
    return humanizeSlugsInText(rawText);
  }

  return `Uma boa escolha para quem procura ${atmosphere}, ${companion} e ${intention}.`;
}
