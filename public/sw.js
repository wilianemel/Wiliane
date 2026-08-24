// Service worker mínimo, escrito à mão (sem Workbox/next-pwa) — cacheia só
// o app-shell estático (bundle JS/CSS do Next.js, ícones, manifest). NUNCA
// cacheia nem intercepta:
//   - páginas HTML (navegação): dado vem do Supabase e muda a cada
//     publicação/edição de estabelecimento — cache aqui mostraria
//     conteúdo desatualizado (busca, perfil, painel);
//   - qualquer URL contendo "/storage/v1/object/" (Supabase Storage):
//     vídeos e fotos de estabelecimentos, grandes demais pra cache e usam
//     Range requests pra permitir avançar o vídeo, que cache quebra;
//   - qualquer host "supabase.co" (API, auth, RPCs): sempre precisa bater
//     no servidor, nunca servir do cache;
//   - qualquer requisição que não seja GET: upload de mídia é sempre
//     POST/PUT, filtrado antes de qualquer outra checagem.

const CACHE_VERSION = "qualeaboa-shell-v1";

const NEVER_CACHE_PATTERNS = [/\/storage\/v1\/object\//, /supabase\.co/];

function isStaticShellAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/favicon.ico" ||
      url.pathname === "/apple-icon.png" ||
      url.pathname === "/manifest.webmanifest")
  );
}

self.addEventListener("install", () => {
  // Ativa a nova versão assim que instalada — atualização do app shell
  // precisa propagar sem esperar todas as abas antigas fecharem.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Nunca intercepta upload (POST/PUT/DELETE) nem qualquer método fora de leitura.
  if (request.method !== "GET") return;

  if (NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(request.url))) return;

  const url = new URL(request.url);

  // Navegação (documento HTML): sempre rede, nunca cache — nenhuma rota
  // deste app é estática o bastante pra ficar presa numa versão antiga.
  if (request.mode === "navigate") return;

  // Fora do app-shell estático conhecido: deixa o navegador tratar
  // normalmente, sem passar pelo cache (mesmo comportamento de não ter
  // service worker nenhum para essa requisição).
  if (!isStaticShellAsset(url)) return;

  // Stale-while-revalidate: responde rápido do cache quando existir, mas
  // sempre busca uma versão nova em paralelo e atualiza o cache — nunca
  // fica preso numa versão velha do bundle indefinidamente.
  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    ),
  );
});
