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
