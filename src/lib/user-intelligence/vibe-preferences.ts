import { VENUE_CATEGORIES, OTHER_CATEGORY } from "@/lib/venues/venue-categories";
import { ATMOSPHERE_TAG_GROUPS, COMPANION_TAG_OPTIONS, type TagOption } from "@/lib/venues/venue-tags";

/**
 * Categorias que a tela "Minha vibe" exibe/gerencia — todas as
 * VENUE_CATEGORIES menos "Outros" (não é uma preferência real, é um
 * escape hatch de cadastro).
 */
export const VIBE_CATEGORY_OPTIONS: string[] = VENUE_CATEGORIES.filter(
  (category) => category !== OTHER_CATEGORY,
);

const AMBIENTE_GROUP = ATMOSPHERE_TAG_GROUPS.find((group) => group.title === "Ambiente");

/**
 * V1 de "Minha vibe" só usa o grupo "Ambiente" de ATMOSPHERE_TAG_GROUPS —
 * "Estilo"/"Diferenciais" ficam fora por enquanto. Se algum desses já
 * estiver salvo em favorite_atmospheres (ex.: aprendido por favoritar um
 * venue), mergeManagedSelection() abaixo preserva esses valores intactos.
 */
export const VIBE_ATMOSPHERE_OPTIONS: TagOption[] = AMBIENTE_GROUP?.options ?? [];

export const VIBE_COMPANION_OPTIONS: TagOption[] = COMPANION_TAG_OPTIONS;

/**
 * "Minha vibe" só gerencia um SUBCONJUNTO de cada array de
 * user_preferences — nunca deve apagar silenciosamente valores inferidos
 * fora desse subconjunto (ex.: categoria antiga fora da lista padrão,
 * atmosfera de "Estilo"/"Diferenciais" aprendida por favoritar um venue,
 * ou qualquer valor legado). Troca só o que está dentro de `managedValues`
 * pelo que está selecionado agora; preserva tudo que já existia fora dele.
 */
export function mergeManagedSelection(
  existing: string[],
  managedValues: readonly string[],
  selected: string[],
): string[] {
  const managed = new Set(managedValues);
  const preserved = existing.filter((value) => !managed.has(value));
  return Array.from(new Set([...preserved, ...selected]));
}
