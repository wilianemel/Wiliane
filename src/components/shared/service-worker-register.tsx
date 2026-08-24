"use client";

import { useEffect } from "react";

/**
 * Registra public/sw.js só no navegador, depois do primeiro paint —
 * `navigator.serviceWorker` não existe durante SSR, e o registro nunca deve
 * bloquear/atrasar o carregamento inicial da página. Não renderiza nada;
 * falha de registro (navegador sem suporte, rede indisponível) é só
 * logada, nunca quebra o restante do app.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("[sw] Falha ao registrar o service worker:", error);
    });
  }, []);

  return null;
}
