import type { AtmosphereId, CompanionId } from "@/types/discovery";

/**
 * Chave estável de cada grupo de atmosfera exibido em "Qual é o estilo do
 * seu estabelecimento?" — usada como parte do valor interno de uma opção
 * "Outro" personalizada (ver CustomAtmosphereValue), independente do texto
 * do título do grupo (que é só exibição).
 */
export type AtmosphereGroupKey = "ambiente" | "estilo" | "diferenciais";

/**
 * Formato interno de uma atmosfera personalizada ("Outro" + descrição
 * livre), salva na mesma coluna `atmospheres` (text[]) das opções fixas —
 * ver funções buildCustomAtmosphereValue/isCustomAtmosphereValue abaixo.
 */
export type CustomAtmosphereValue = `custom:${AtmosphereGroupKey}:${string}`;

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
 * `CustomAtmosphereValue` amplia o tipo, de forma segura (template literal
 * type), para aceitar também a descrição livre de "Outro" por grupo — sem
 * abrir mão da checagem estrita dos literais fixos abaixo.
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
  | "espaco-kids"
  | CustomAtmosphereValue;

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

/** Grupo de atmosfera com chave estável — só ATMOSPHERE_TAG_GROUPS usa (ver AtmosphereGroupKey). */
export interface AtmosphereTagGroup extends TagGroup {
  key: AtmosphereGroupKey;
}

/** Nenhum grupo é excludente — um estabelecimento pode marcar itens de vários grupos ao mesmo tempo. */
export const ATMOSPHERE_TAG_GROUPS: AtmosphereTagGroup[] = [
  {
    key: "ambiente",
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
    key: "estilo",
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
    key: "diferenciais",
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

// ============================================================================
// Atmosfera personalizada ("Outro" + descrição livre por grupo)
// ============================================================================
//
// Fonte única de verdade para criar/reconhecer/ler os valores personalizados
// salvos dentro de `atmospheres` (text[]) junto com as opções fixas acima.
// Nunca entram em ATMOSPHERE_TAG_IDS — essa constante representa só as
// opções fixas do questionário/formulário.

const CUSTOM_ATMOSPHERE_PREFIX = "custom";

const CUSTOM_ATMOSPHERE_GROUP_KEYS: AtmosphereGroupKey[] = ATMOSPHERE_TAG_GROUPS.map(
  (group) => group.key,
);

/** Tamanho máximo de uma descrição personalizada — mesmo limite aplicado nos formulários (maxLength do campo). */
export const CUSTOM_ATMOSPHERE_MAX_LENGTH = 100;

/**
 * Estado de "Outro" por grupo, usado pelos formulários do painel: `null` =
 * não marcado; string (mesmo vazia) = marcado, com a descrição digitada até
 * agora. Nunca usa `boolean` separado — o próprio valor já carrega os dois
 * sinais (marcado? qual texto?).
 */
export type CustomAtmosphereDescriptions = Record<AtmosphereGroupKey, string | null>;

/** Estado inicial "nada marcado" — usado antes de identificar valores já salvos. */
export const EMPTY_CUSTOM_ATMOSPHERE_DESCRIPTIONS: CustomAtmosphereDescriptions = {
  ambiente: null,
  estilo: null,
  diferenciais: null,
};

/** Monta o valor interno salvo em `atmospheres` para a descrição personalizada de um grupo. */
export function buildCustomAtmosphereValue(
  group: AtmosphereGroupKey,
  description: string,
): CustomAtmosphereValue {
  return `${CUSTOM_ATMOSPHERE_PREFIX}:${group}:${description.trim()}`;
}

/** True se `value` é uma atmosfera personalizada (de qualquer grupo) — nunca uma das opções fixas. */
export function isCustomAtmosphereValue(value: string): value is CustomAtmosphereValue {
  return CUSTOM_ATMOSPHERE_GROUP_KEYS.some((group) =>
    value.startsWith(`${CUSTOM_ATMOSPHERE_PREFIX}:${group}:`),
  );
}

/** A qual grupo pertence uma atmosfera personalizada — `null` se `value` não for um valor personalizado válido. */
export function getCustomAtmosphereGroup(value: string): AtmosphereGroupKey | null {
  return (
    CUSTOM_ATMOSPHERE_GROUP_KEYS.find((group) =>
      value.startsWith(`${CUSTOM_ATMOSPHERE_PREFIX}:${group}:`),
    ) ?? null
  );
}

/**
 * Descrição pura, sem o prefixo interno — string vazia se `value` não for
 * uma atmosfera personalizada válida. Só usa `slice`, nunca `split(":")`
 * sozinho, para preservar eventuais dois-pontos dentro da própria descrição.
 */
export function getCustomAtmosphereDescription(value: string): string {
  const group = getCustomAtmosphereGroup(value);
  if (!group) return "";
  return value.slice(`${CUSTOM_ATMOSPHERE_PREFIX}:${group}:`.length);
}

/**
 * Texto pronto para exibição pública de uma atmosfera (fixa ou
 * personalizada) — nunca o prefixo interno "custom:...". `null` quando
 * `value` não corresponde a nada exibível (nem opção fixa conhecida, nem
 * personalizada com descrição real). Função central: todo lugar que
 * transforma um id de atmosfera em rótulo visível deve usar esta função.
 */
export function getAtmosphereDisplayLabel(value: string): string | null {
  if (isCustomAtmosphereValue(value)) {
    const description = getCustomAtmosphereDescription(value).trim();
    return description.length > 0 ? description : null;
  }
  return ATMOSPHERE_TAG_LABELS[value] ?? null;
}

/**
 * A partir de uma lista de atmosferas já salva (fixa + personalizada),
 * reconstrói o estado de "Outro" por grupo — usada ao abrir um
 * estabelecimento já cadastrado. Só considera a primeira ocorrência por
 * grupo (autocura eventuais duplicatas antigas: o próximo save já produz no
 * máximo uma por grupo, ver buildAtmospheresToSave).
 */
export function extractCustomAtmosphereDescriptions(
  atmospheres: readonly string[],
): CustomAtmosphereDescriptions {
  const result: CustomAtmosphereDescriptions = { ...EMPTY_CUSTOM_ATMOSPHERE_DESCRIPTIONS };
  for (const value of atmospheres) {
    const group = getCustomAtmosphereGroup(value);
    if (group && result[group] === null) {
      result[group] = getCustomAtmosphereDescription(value);
    }
  }
  return result;
}

/**
 * Monta o array final de `atmospheres` para salvar: preserva os valores
 * fixos recebidos (na ordem em que já estavam) e substitui, por grupo, o
 * valor personalizado antigo pelo novo — nunca acumula nem duplica mais de
 * um valor personalizado por grupo. Grupo com descrição `null` ou só espaços
 * não entra no resultado.
 */
export function buildAtmospheresToSave(
  fixedValues: readonly VenueAtmosphereTag[],
  customDescriptions: CustomAtmosphereDescriptions,
): VenueAtmosphereTag[] {
  const fixedOnly = fixedValues.filter((value) => !isCustomAtmosphereValue(value));
  const customEntries = CUSTOM_ATMOSPHERE_GROUP_KEYS.map((group) => {
    const description = customDescriptions[group];
    if (description === null) return null;
    const trimmed = description.trim();
    return trimmed.length > 0 ? buildCustomAtmosphereValue(group, trimmed) : null;
  }).filter((value): value is CustomAtmosphereValue => value !== null);
  return [...fixedOnly, ...customEntries];
}

/** True se algum grupo estiver com "Outro" marcado e a descrição vazia/só espaços — bloqueia o salvamento. */
export function hasEmptyCustomAtmosphereDescription(
  customDescriptions: CustomAtmosphereDescriptions,
): boolean {
  return CUSTOM_ATMOSPHERE_GROUP_KEYS.some((group) => {
    const description = customDescriptions[group];
    return description !== null && description.trim().length === 0;
  });
}
