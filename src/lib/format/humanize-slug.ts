/**
 * Converte um valor em formato de slug técnico (ex.: "pizza-romana",
 * "cafe_colonial") em texto de leitura natural ("Pizza romana", "Cafe
 * colonial").
 *
 * Só transforma valores que realmente parecem um slug (hífen ou underscore,
 * sem espaço) — texto que já veio legível do banco (com espaços, acentos,
 * frases completas) passa direto, sem alteração, para não reformatar dado
 * que já está correto.
 */
export function humanizeSlug(value: string): string {
  if (!value) return value;

  const looksLikeSlug = /[-_]/.test(value) && !/\s/.test(value);
  if (!looksLikeSlug) return value;

  const spaced = value.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Substitui, dentro de uma frase já pronta (ex.: vinda de uma função do
 * Supabase que não controlamos), qualquer token isolado em formato de slug
 * pelo equivalente com espaços, preservando o restante da frase como veio.
 * Não recapitaliza — o token está no meio de uma frase, não no início dela.
 */
export function humanizeSlugsInText(text: string): string {
  return text.replace(/\b[a-z0-9]+(?:-[a-z0-9]+)+\b/gi, (token) => token.replace(/-/g, " "));
}
