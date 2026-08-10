const STORAGE_KEY = "qeb_anonymous_id";

/**
 * Identificador anônimo local — só um UUID aleatório persistido em
 * localStorage, sem nenhuma informação de dispositivo, IP ou
 * fingerprinting. Serve só para agrupar os eventos de um mesmo visitante
 * não autenticado; não é derivado de nenhum dado do navegador/hardware.
 *
 * Retorna `null` quando não é possível gerar/persistir (SSR, localStorage
 * indisponível — ex.: modo privado do Safari lança ao chamar setItem).
 */
export function getAnonymousId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const generated = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    return null;
  }
}
