"use client";

import { useEffect } from "react";

/**
 * Rola suavemente até o elemento cujo id bate com o hash da URL (#id) — só
 * depois que `ready` vira true. Usada em telas que carregam os dados por
 * trás de um gate assíncrono (ex.: VenueAccessGate): o scroll nativo do
 * navegador/Next.js para links com hash pode disparar antes mesmo do
 * elemento existir no DOM (ainda no spinner de carregamento), e nunca
 * tenta de novo depois. Chamar com `ready=true` só quando o conteúdo real
 * (com os ids das seções) já estiver montado resolve isso.
 */
export function useScrollToHash(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const hash = window.location.hash;
    if (!hash) return;

    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ready]);
}
