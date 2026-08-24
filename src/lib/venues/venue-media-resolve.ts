/**
 * CORREÇÃO (causa real do erro de servidor em /lugares/[slug]): estas duas
 * funções viviam em venue-media.ts, que tem "use client" no topo (precisa
 * ser client porque outras exportações dali usam createClient() do
 * navegador, File, etc.). venue-repository.ts (server-only) CHAMAVA essas
 * funções diretamente — não só importava o tipo — e o runtime de React
 * Server Components do Next.js proíbe isso: "Attempted to call
 * resolveFeaturedMediaUrl() from the server but resolveFeaturedMediaUrl is
 * on the client", lançado toda vez que a função era de fato invocada (ou
 * seja, em TODA chamada a getPublishedVenueBySlug, não só para vídeo).
 *
 * Este módulo não tem "use client" nem nenhum import que dependa do
 * navegador — só lógica pura — então pode ser chamado com segurança tanto
 * do servidor (venue-repository.ts) quanto do cliente (via re-export em
 * venue-media.ts, usado pela prévia do painel do dono). Nenhuma mudança de
 * comportamento: mesma lógica, só o arquivo que a hospeda mudou.
 */

export type ResolvableMediaKind = "image" | "video";

export interface ResolvableMainImage {
  url: string;
  mediaType: ResolvableMediaKind;
  isFeatured: boolean;
}

/**
 * Mídia destacada de um tipo (image ou video) > primeira ATIVA desse tipo
 * (mais antiga primeiro, já que a lista normalmente vem ordenada por
 * created_at ascendente) > fallback (cover_image_url/video_url legados,
 * NUNCA apagados, só preteridos quando existe mídia canônica melhor).
 */
export function resolveFeaturedMediaUrl(
  items: ResolvableMainImage[] | undefined,
  mediaType: ResolvableMediaKind,
  fallback?: string | null,
): string | undefined {
  if (!items || items.length === 0) return fallback ?? undefined;
  // Defensivo: uma url vazia/nula nunca deve virar `src` de <Image>/<video>
  // — o Next.js Image lança exceção em render (não só um aviso) pra src
  // inválido, o que derrubaria a página inteira em vez de só a mídia.
  const onlyType = items.filter(
    (item) => item.mediaType === mediaType && typeof item.url === "string" && item.url.trim().length > 0,
  );
  if (onlyType.length === 0) return fallback ?? undefined;
  return (onlyType.find((item) => item.isFeatured) ?? onlyType[0]).url;
}

/**
 * Imagem principal do estabelecimento — atalho fino sobre
 * resolveFeaturedMediaUrl fixado em "image". Capa deixou de ser obrigatória
 * para publicar, mas continua funcionando como destaque quando existe.
 */
export function resolveVenueMainImageUrl(
  images: ResolvableMainImage[] | undefined,
  fallback?: string | null,
): string | undefined {
  return resolveFeaturedMediaUrl(images, "image", fallback);
}
