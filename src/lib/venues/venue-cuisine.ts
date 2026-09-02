import type { TagGroup } from "@/lib/venues/venue-tags";

/**
 * Culinária simplificada em dois campos fixos (brasileira + internacional)
 * + "Outro" para o que não está nas listas — substitui o campo de texto
 * livre que existia antes nas 3 telas do fluxo empresarial (cadastro novo,
 * preenchimento de estabelecimento existente, edição no painel). Segue o
 * mesmo padrão de "Outro" já usado para atmosfera (ver venue-tags.ts:
 * CUSTOM_ATMOSPHERE_PREFIX/buildCustomAtmosphereValue etc.), mas com um
 * único grupo (sem chave por grupo), já que só existe um "Outro" aqui.
 *
 * Continua salvo na mesma coluna `cuisine_types` (text[], já existente em
 * public.venues — ver 001_create_venues.sql) — nenhuma coluna nova.
 */
export const CUISINE_TAG_GROUPS: TagGroup[] = [
  {
    title: "Culinária brasileira",
    options: [
      { id: "Brasileira", label: "Brasileira" },
      { id: "Mineira", label: "Mineira" },
      { id: "Nordestina", label: "Nordestina" },
      { id: "Baiana", label: "Baiana" },
      { id: "Gaúcha", label: "Gaúcha" },
      { id: "Caipira", label: "Caipira" },
      { id: "Comida de boteco", label: "Comida de boteco" },
      { id: "Churrasco / Parrilla", label: "Churrasco / Parrilla" },
      { id: "Frutos do mar", label: "Frutos do mar" },
    ],
  },
  {
    title: "Culinária internacional",
    options: [
      { id: "Italiana", label: "Italiana" },
      { id: "Espanhola / Portuguesa", label: "Espanhola / Portuguesa" },
      { id: "Francesa", label: "Francesa" },
      { id: "Alemã", label: "Alemã" },
      { id: "Mediterrânea", label: "Mediterrânea" },
      { id: "Árabe", label: "Árabe" },
      { id: "Mexicana", label: "Mexicana" },
      { id: "Argentina", label: "Argentina" },
      { id: "Asiática", label: "Asiática" },
      { id: "Japonesa", label: "Japonesa" },
      { id: "Chinesa", label: "Chinesa" },
    ],
  },
];

const CUISINE_OPTION_IDS: string[] = CUISINE_TAG_GROUPS.flatMap((group) =>
  group.options.map((option) => option.id),
);

/** Remove acentos e normaliza caixa — só para comparar/casar texto, nunca para exibir ou salvar. */
function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const CUSTOM_CUISINE_PREFIX = "custom:cuisine:";

/** Tamanho máximo do texto de "Outro" — mesmo limite já usado para "Outro" de atmosfera. */
export const CUSTOM_CUISINE_MAX_LENGTH = 100;

/** Monta o valor interno salvo em `cuisine_types` para a descrição livre de "Outro". */
export function buildCustomCuisineValue(description: string): string {
  return `${CUSTOM_CUISINE_PREFIX}${description.trim()}`;
}

/** True se `value` é o "Outro" de culinária — nunca uma das opções fixas nem texto legado livre. */
export function isCustomCuisineValue(value: string): boolean {
  return value.startsWith(CUSTOM_CUISINE_PREFIX);
}

/** Descrição pura de "Outro", sem o prefixo interno — string vazia se `value` não for um valor de "Outro". */
export function getCustomCuisineDescription(value: string): string {
  return isCustomCuisineValue(value) ? value.slice(CUSTOM_CUISINE_PREFIX.length) : "";
}

/**
 * Texto pronto para exibição/busca de uma culinária (opção fixa, "Outro" ou
 * texto legado livre digitado antes desta mudança) — nunca o prefixo
 * interno "custom:cuisine:...". Toda leitura pública de `cuisine_types`
 * (perfil do estabelecimento, busca) deve passar por aqui.
 */
export function getCuisineDisplayLabel(value: string): string {
  return isCustomCuisineValue(value) ? getCustomCuisineDescription(value).trim() : value;
}

/** A descrição atual de "Outro" salva numa lista — `null` se não houver nenhuma (checkbox desmarcado). */
export function extractCustomCuisineDescription(cuisineTypes: readonly string[]): string | null {
  const found = cuisineTypes.find(isCustomCuisineValue);
  return found ? getCustomCuisineDescription(found) : null;
}

/** True se "Outro" estiver marcado (não-null) com descrição vazia/só espaços — bloqueia o salvamento, mesma regra de hasEmptyCustomAtmosphereDescription. */
export function hasEmptyCustomCuisineDescription(customDescription: string | null): boolean {
  return customDescription !== null && customDescription.trim().length === 0;
}

/**
 * Reconcilia uma lista de `cuisine_types` já salva (texto livre, sem
 * taxonomia até esta mudança) com as novas opções fixas: casa por texto
 * (ignorando acento/caixa) e devolve o id canônico quando encontra
 * correspondência — nunca apaga nada; um valor sem correspondência (ex.:
 * "Cafeteria", "Petiscos", digitado livremente antes) segue preservado
 * exatamente como estava, só não aparece marcado em nenhum checkbox.
 * Nunca inclui o valor de "Outro" (fica em customCuisineDescription à
 * parte). Usada ao abrir qualquer um dos 3 formulários com dados existentes.
 */
export function reconcileCuisineTypesForEditing(existing: readonly string[]): string[] {
  const reconciled = existing
    .filter((value) => !isCustomCuisineValue(value))
    .map((value) => {
      const match = CUISINE_OPTION_IDS.find(
        (id) => normalizeForMatch(id) === normalizeForMatch(value),
      );
      return match ?? value;
    });
  return Array.from(new Set(reconciled));
}

/**
 * Monta o array final de `cuisine_types` para salvar: mantém tudo que não é
 * o "Outro" anterior (opções fixas marcadas + qualquer texto legado
 * preservado por reconcileCuisineTypesForEditing) e acrescenta/atualiza o
 * "Outro" atual. `customDescription` null = "Outro" desmarcado.
 */
export function buildCuisineTypesToSave(
  currentValues: readonly string[],
  customDescription: string | null,
): string[] {
  const withoutCustom = currentValues.filter((value) => !isCustomCuisineValue(value));
  if (customDescription === null) return withoutCustom;
  const trimmed = customDescription.trim();
  return trimmed.length > 0 ? [...withoutCustom, buildCustomCuisineValue(trimmed)] : withoutCustom;
}
