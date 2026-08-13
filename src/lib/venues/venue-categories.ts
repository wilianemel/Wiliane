/**
 * Categorias estruturadas de estabelecimento — usadas nos formulários de
 * cadastro (`novo-estabelecimento-form.tsx`) e edição (`editar/page.tsx`)
 * como um `<select>`, em vez de texto livre.
 *
 * `public.venues.category` continua sendo uma coluna `text` comum: aqui só
 * fixamos as opções que o formulário oferece, o valor salvo é sempre uma
 * dessas strings. Estabelecimentos antigos com categoria fora desta lista
 * continuam existindo e sendo exibidos normalmente — só não vão bater com
 * nenhuma opção do select até o dono reabrir a edição e escolher uma.
 */
export const VENUE_CATEGORIES = [
  "Restaurante",
  "Pizzaria",
  "Hamburgueria",
  "Lanchonete",
  "Cafeteria",
  "Padaria",
  "Bar",
  "Pub",
  "Balada",
  "Eventos",
  "Churrascaria",
  "Doceria",
  "Sorveteria",
  "Adega/Vinhos",
  "Parque/Lazer",
  "Outros",
] as const;

export type VenueCategory = (typeof VENUE_CATEGORIES)[number];

export const OTHER_CATEGORY: VenueCategory = "Outros";
const OTHER_CATEGORY_PREFIX = "Outros - ";

/**
 * `category` no banco continua sendo uma única string. Quando o dono escolhe
 * "Outros" e descreve a categoria, salvamos como "Outros - {descrição}" —
 * essas duas funções convertem entre essa string e o par
 * (opção do select, texto livre) que o formulário edita.
 */
export function splitCategoryValue(category: string): { select: string; custom: string } {
  if (category.startsWith(OTHER_CATEGORY_PREFIX)) {
    return { select: OTHER_CATEGORY, custom: category.slice(OTHER_CATEGORY_PREFIX.length) };
  }
  if (category.trim() === OTHER_CATEGORY) {
    return { select: OTHER_CATEGORY, custom: "" };
  }
  return { select: category, custom: "" };
}

export function combineCategoryValue(select: string, custom: string): string {
  if (select === OTHER_CATEGORY) {
    return custom.trim() ? `${OTHER_CATEGORY_PREFIX}${custom.trim()}` : OTHER_CATEGORY;
  }
  return select;
}
