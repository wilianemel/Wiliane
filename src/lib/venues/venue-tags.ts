import type { AtmosphereId, CompanionId } from "@/types/discovery";

/**
 * Taxonomia estendida de tags do estabelecimento (ambiente, estilo,
 * experiência e público). Armazenada nas mesmas colunas `atmospheres` e
 * `companions` (text[], sem enum no banco — ver 001_create_venues.sql) já
 * usadas pelo questionário de /descobrir.
 *
 * `AtmosphereId`/`CompanionId` continuam sendo só as opções que um
 * visitante pode escolher no questionário (seleção única). Um
 * estabelecimento pode se descrever com um vocabulário bem mais rico —
 * por isso estes tipos são supersets, não substituem os originais.
 *
 * Pensado para alimentar futuramente o motor de afinidade
 * (src/lib/match-engine.ts) com mais sinais de recomendação além dos que
 * o questionário atual usa.
 */
export type VenueAtmosphereTag =
  | AtmosphereId
  | "aconchegante"
  | "intimista"
  | "descolado"
  | "alternativo"
  | "jovem"
  | "elegante"
  | "luxuoso"
  | "raiz-tradicional"
  | "exclusivo"
  | "nostalgico"
  | "musica-ao-vivo"
  | "natureza"
  | "gastronomico"
  | "instagramavel"
  | "cultural"
  | "pet-friendly"
  | "badalado"
  | "vista-bonita"
  | "area-externa"
  | "estacionamento"
  | "espaco-kids";

export type VenueCompanionTag =
  | CompanionId
  | "bebes"
  | "lgbtqia-friendly"
  | "terceira-idade"
  | "empresarial"
  | "turistas";

/**
 * Melhor momento de consumo (período do dia, ocasião, ritmo da
 * experiência). Sem coluna própria ainda — ver o comentário em
 * MOMENT_TAG_GROUPS sobre onde isso é armazenado hoje.
 */
export type VenueMomentTag =
  | "cafe-da-manha"
  | "almoco"
  | "fim-de-tarde"
  | "happy-hour"
  | "jantar"
  | "noite"
  | "madrugada"
  | "primeiro-encontro"
  | "encontro-romantico"
  | "comemoracao"
  | "aniversario"
  | "familia-no-domingo"
  | "role-com-amigos"
  | "reuniao-de-trabalho"
  | "viagem-turismo"
  | "rapido-e-pratico"
  | "para-ficar-horas"
  | "para-conversar"
  | "para-celebrar"
  | "para-relaxar";

export interface TagOption {
  id: string;
  label: string;
}

export interface TagGroup {
  title: string;
  options: TagOption[];
}

/** Nenhum grupo é excludente — um estabelecimento pode marcar itens de vários grupos ao mesmo tempo. */
export const ATMOSPHERE_TAG_GROUPS: TagGroup[] = [
  {
    title: "Ambiente",
    options: [
      { id: "tranquilo", label: "Tranquilo" },
      { id: "animado", label: "Animado" },
      { id: "romantico", label: "Romântico" },
      { id: "familiar", label: "Familiar" },
      { id: "sofisticado", label: "Sofisticado" },
      { id: "casual", label: "Casual" },
      { id: "aconchegante", label: "Aconchegante" },
      { id: "intimista", label: "Intimista" },
    ],
  },
  {
    title: "Estilo",
    options: [
      { id: "descolado", label: "Descolado" },
      { id: "alternativo", label: "Alternativo" },
      { id: "jovem", label: "Jovem" },
      { id: "elegante", label: "Elegante" },
      { id: "luxuoso", label: "Luxuoso" },
      { id: "raiz-tradicional", label: "Raiz / tradicional" },
      { id: "exclusivo", label: "Exclusivo" },
      { id: "nostalgico", label: "Nostálgico" },
    ],
  },
  {
    title: "Diferenciais",
    options: [
      { id: "musica-ao-vivo", label: "Música ao vivo" },
      { id: "natureza", label: "Natureza" },
      { id: "gastronomico", label: "Gastronômico" },
      { id: "instagramavel", label: "Instagramável" },
      { id: "cultural", label: "Cultural" },
      { id: "pet-friendly", label: "Pet friendly" },
      { id: "badalado", label: "Badalado" },
      { id: "vista-bonita", label: "Vista bonita" },
      { id: "area-externa", label: "Área externa" },
      { id: "estacionamento", label: "Estacionamento" },
      { id: "espaco-kids", label: "Espaço kids" },
    ],
  },
];

export const COMPANION_TAG_OPTIONS: TagOption[] = [
  { id: "sozinho", label: "Sozinho" },
  { id: "casal", label: "Casal" },
  { id: "familia", label: "Família" },
  { id: "amigos", label: "Amigos" },
  { id: "criancas", label: "Crianças" },
  { id: "bebes", label: "Bebês" },
  { id: "pets", label: "Pets" },
  { id: "lgbtqia-friendly", label: "LGBTQIA+ friendly" },
  { id: "terceira-idade", label: "Terceira idade" },
  { id: "empresarial", label: "Empresarial / reuniões" },
  { id: "turistas", label: "Turistas" },
];

/**
 * Sem coluna dedicada em public.venues ainda (ver 001_create_venues.sql) —
 * criar uma (`moments text[]`) seria o mais correto a longo prazo, mas por
 * ora essas tags são gravadas dentro da coluna `tags`, que já é genérica e
 * sem filtro no mapper. `experience-questions.tsx` é responsável por
 * preservar as tags não relacionadas a momento já existentes ao salvar.
 */
export const MOMENT_TAG_GROUPS: TagGroup[] = [
  {
    title: "Período",
    options: [
      { id: "cafe-da-manha", label: "Café da manhã" },
      { id: "almoco", label: "Almoço" },
      { id: "fim-de-tarde", label: "Fim de tarde" },
      { id: "happy-hour", label: "Happy hour" },
      { id: "jantar", label: "Jantar" },
      { id: "noite", label: "Noite" },
      { id: "madrugada", label: "Madrugada" },
    ],
  },
  {
    title: "Ocasião",
    options: [
      { id: "primeiro-encontro", label: "Primeiro encontro" },
      { id: "encontro-romantico", label: "Encontro romântico" },
      { id: "comemoracao", label: "Comemoração" },
      { id: "aniversario", label: "Aniversário" },
      { id: "familia-no-domingo", label: "Família no domingo" },
      { id: "role-com-amigos", label: "Rolê com amigos" },
      { id: "reuniao-de-trabalho", label: "Reunião de trabalho" },
      { id: "viagem-turismo", label: "Viagem/turismo" },
    ],
  },
  {
    title: "Ritmo da experiência",
    options: [
      { id: "rapido-e-pratico", label: "Rápido e prático" },
      { id: "para-ficar-horas", label: "Para ficar horas" },
      { id: "para-conversar", label: "Para conversar" },
      { id: "para-celebrar", label: "Para celebrar" },
      { id: "para-relaxar", label: "Para relaxar" },
    ],
  },
];

export const ATMOSPHERE_TAG_IDS: VenueAtmosphereTag[] = ATMOSPHERE_TAG_GROUPS.flatMap((group) =>
  group.options.map((option) => option.id as VenueAtmosphereTag),
);

export const COMPANION_TAG_IDS: VenueCompanionTag[] = COMPANION_TAG_OPTIONS.map(
  (option) => option.id as VenueCompanionTag,
);

export const MOMENT_TAG_IDS: VenueMomentTag[] = MOMENT_TAG_GROUPS.flatMap((group) =>
  group.options.map((option) => option.id as VenueMomentTag),
);

function labelMapFromOptions(options: TagOption[]): Record<string, string> {
  return Object.fromEntries(options.map((option) => [option.id, option.label]));
}

/**
 * Labels corretos (com acento) por id, derivados direto das opções acima —
 * uma única fonte de verdade. Usados na exibição pública do estabelecimento
 * (venue-profile.tsx) em vez de humanizeSlug(), que não recupera acento.
 */
export const ATMOSPHERE_TAG_LABELS: Record<string, string> = labelMapFromOptions(
  ATMOSPHERE_TAG_GROUPS.flatMap((group) => group.options),
);

export const COMPANION_TAG_LABELS: Record<string, string> = labelMapFromOptions(
  COMPANION_TAG_OPTIONS,
);

export const MOMENT_TAG_LABELS: Record<string, string> = labelMapFromOptions(
  MOMENT_TAG_GROUPS.flatMap((group) => group.options),
);
