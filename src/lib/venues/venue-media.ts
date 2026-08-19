"use client";

import { createClient } from "@/lib/supabase/client";

export const MEDIA_BUCKET = "venue-media";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;

/** Mesmo teto configurado no bucket venue-media (50 MB) — validado aqui só para feedback rápido; a aplicação real do limite é no servidor. */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export type MediaKind = "image" | "video";

export interface VenueEffectiveLimits {
  planType: string;
  videoLimit: number;
  imageLimit: number;
  viewLimit: number | null;
  viewCount: number;
}

interface VenueEffectiveLimitsRow {
  plan_type: string;
  video_limit: number;
  image_limit: number;
  view_limit: number | null;
  view_count: number;
}

const FREE_PLAN_FALLBACK: VenueEffectiveLimits = {
  planType: "free",
  videoLimit: 1,
  imageLimit: 1,
  viewLimit: 300,
  viewCount: 0,
};

/**
 * Limites efetivos do plano ativo do venue (vídeo/imagem/visualização), via
 * RPC get_venue_effective_limits — a autoridade real continua sendo o banco
 * (gatilhos de limite, migration venue_commercial_plans); isto só existe
 * pra mostrar "X/Y" no painel sem esperar um upload falhar. A RPC já roda o
 * downgrade automático (lazy) do plano partner vencido antes de responder,
 * então o painel nunca mostra um plano vencido como se ainda estivesse ativo.
 */
export async function getVenueEffectiveLimits(venueId: string): Promise<VenueEffectiveLimits> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_venue_effective_limits", { p_venue_id: venueId });

  if (error || !data || data.length === 0) return FREE_PLAN_FALLBACK;

  const row = data[0] as VenueEffectiveLimitsRow;
  return {
    planType: row.plan_type,
    videoLimit: row.video_limit,
    imageLimit: row.image_limit,
    viewLimit: row.view_limit,
    viewCount: row.view_count,
  };
}

/** Limite de vídeos do plano ativo — atalho fino sobre getVenueEffectiveLimits. */
export async function getVenueVideoLimit(venueId: string): Promise<number> {
  return (await getVenueEffectiveLimits(venueId)).videoLimit;
}

/** Limite de imagens da galeria do plano ativo — atalho fino sobre getVenueEffectiveLimits. */
export async function getVenueImageLimit(venueId: string): Promise<number> {
  return (await getVenueEffectiveLimits(venueId)).imageLimit;
}

export function validateMediaFile(file: File, kind: MediaKind): string | null {
  const allowed = kind === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  if (!(allowed as readonly string[]).includes(file.type)) {
    return kind === "image"
      ? "Formato inválido. Envie um arquivo JPG, PNG ou WebP."
      : "Formato inválido. Envie um arquivo MP4 ou WebM.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Arquivo muito grande. O limite é 50 MB.";
  }
  return null;
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return cleaned || "arquivo";
}

export function getMediaPublicUrl(path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Slots de mídia únicos (capa, logo, vídeo): envia o arquivo NOVO com um
 * nome único (timestamp) — nunca no lugar do antigo. CORREÇÃO (auditoria
 * 3ª rodada): o arquivo antigo nunca é apagado do Storage em nenhum fluxo
 * — nem aqui, nem depois de confirmada a gravação no banco. Um arquivo
 * órfão trocado de capa/logo/vídeo só fica sem nenhuma linha ativa
 * apontando pra ele; a limpeza física, se um dia existir, será uma
 * rotina segura separada, nunca parte deste fluxo de escrita do usuário.
 */
export async function replaceSingleMedia(
  venueId: string,
  folder: "cover" | "logo" | "video",
  file: File,
): Promise<{ url: string; path: string } | { error: string }> {
  const supabase = createClient();
  const prefix = `${venueId}/${folder}`;
  const path = `${prefix}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
  });

  if (error) {
    return { error: "Não foi possível enviar o arquivo agora. Tente novamente." };
  }

  return { url: getMediaPublicUrl(path), path };
}

export interface GalleryItem {
  /** null enquanto a imagem só existe no path antigo do Storage, sem linha em venue_media ainda. */
  id: string | null;
  name: string;
  url: string;
}

interface VenueMediaGalleryRow {
  id: string;
  url: string;
}

/**
 * Galeria do painel (CORREÇÃO — consolidação em venue_media): imagens não
 * destacadas — a capa fica no slot próprio, fora daqui. Une o que já está
 * em venue_media (canônico, com id) com o que ainda só existe no path
 * antigo do Storage (<venue_id>/gallery/..., sem id, pendente de "adoção"
 * na primeira remoção/reenvio) — nunca esconde a galeria antiga enquanto
 * a migração para venue_media não estiver completa. Uma imagem já
 * retirada (is_active=false) some das duas listas: da consulta de ativas
 * (óbvio) e da listagem de Storage (filtrada aqui pela URL retirada) —
 * mesmo que o arquivo continue no bucket, nunca apagado fisicamente.
 */
export async function listGalleryItems(venueId: string): Promise<GalleryItem[]> {
  const supabase = createClient();
  const prefix = `${venueId}/gallery`;

  const [activeResult, retiredResult, storageResult] = await Promise.all([
    supabase
      .from("venue_media")
      .select("id, url")
      .eq("venue_id", venueId)
      .eq("media_type", "image")
      .eq("is_featured", false)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("venue_media")
      .select("url")
      .eq("venue_id", venueId)
      .eq("media_type", "image")
      .eq("is_active", false),
    supabase.storage.from(MEDIA_BUCKET).list(prefix, { sortBy: { column: "created_at", order: "desc" } }),
  ]);

  const canonical = (activeResult.data as VenueMediaGalleryRow[] | null) ?? [];
  const canonicalUrls = new Set(canonical.map((row) => row.url));
  const retiredUrls = new Set(
    ((retiredResult.data as { url: string }[] | null) ?? []).map((row) => row.url),
  );

  const legacyOnly = ((storageResult.data ?? []) as { name: string }[])
    .filter((item) => item.name && !item.name.endsWith("/"))
    .map((item) => ({ name: item.name, url: getMediaPublicUrl(`${prefix}/${item.name}`) }))
    .filter((item) => !canonicalUrls.has(item.url) && !retiredUrls.has(item.url));

  return [
    ...canonical.map((row) => ({ id: row.id, name: row.url.split("/").pop() as string, url: row.url })),
    ...legacyOnly.map((item) => ({ id: null, name: item.name, url: item.url })),
  ];
}

/** Registra/reativa uma imagem de galeria em venue_media via RPC segura (add_venue_gallery_media) — nunca INSERT direto do cliente. */
async function addVenueGalleryMedia(venueId: string, url: string): Promise<{ id: string } | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("add_venue_gallery_media", {
    p_venue_id: venueId,
    p_url: url,
  });

  if (error || !data || data.length === 0) {
    return { error: "Não foi possível registrar a imagem da galeria agora. Tente novamente." };
  }

  return { id: data[0].id as string };
}

/** imageLimit vem do plano ativo (getVenueImageLimit) — a autoridade real é o gatilho de limite do banco; esta checagem só evita um upload que já falharia. */
export async function uploadGalleryImage(
  venueId: string,
  file: File,
  imageLimit: number,
): Promise<{ item: GalleryItem } | { error: string }> {
  const supabase = createClient();
  const prefix = `${venueId}/gallery`;

  const current = await listGalleryItems(venueId);
  if (current.length >= imageLimit) {
    return { error: `Limite de ${imageLimit} imagem${imageLimit === 1 ? "" : "s"} na galeria atingido.` };
  }

  const path = `${prefix}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
  });

  if (uploadError) {
    return { error: "Não foi possível enviar a imagem agora. Tente novamente." };
  }

  const url = getMediaPublicUrl(path);
  const name = path.split("/").pop() as string;

  // Registra em venue_media (canônico) via RPC — se falhar, o arquivo já
  // enviado permanece no Storage (nunca apagado aqui) e a imagem ainda
  // aparece na galeria pela listagem antiga do path, só sem id canônico
  // até uma nova tentativa (próximo upload/remoção tenta de novo).
  const registered = await addVenueGalleryMedia(venueId, url);
  if ("error" in registered) {
    return { item: { id: null, name, url } };
  }

  return { item: { id: registered.id, name, url } };
}

/**
 * Remove uma imagem da galeria — soft delete em venue_media (CORREÇÃO —
 * nunca mais DELETE físico no Storage). Uma imagem ainda sem linha
 * canônica (só existia no path antigo) é adotada primeiro
 * (add_venue_gallery_media) e retirada em seguida; o arquivo em si nunca
 * é apagado — só passa a não aparecer mais, porque listGalleryItems
 * filtra pela URL retirada.
 */
export async function removeGalleryImage(venueId: string, item: GalleryItem): Promise<{ error: string } | null> {
  let mediaId = item.id;

  if (!mediaId) {
    const registered = await addVenueGalleryMedia(venueId, item.url);
    if ("error" in registered) return registered;
    mediaId = registered.id;
  }

  return retireVenueMediaItem(mediaId);
}

export interface VenueMediaListItem {
  id: string;
  url: string;
  mediaType: MediaKind;
  isFeatured: boolean;
}

interface VenueMediaListRow {
  id: string;
  url: string;
  media_type: MediaKind;
  is_featured: boolean;
}

/** Mídia ativa de um venue — usada pelo painel para listar vídeos/capa atuais. Nunca inclui is_active=false. */
export async function listVenueMedia(venueId: string, mediaType?: MediaKind): Promise<VenueMediaListItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("venue_media")
    .select("id, url, media_type, is_featured")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (mediaType) {
    query = query.eq("media_type", mediaType);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as VenueMediaListRow[]).map((row) => ({
    id: row.id,
    url: row.url,
    mediaType: row.media_type,
    isFeatured: row.is_featured,
  }));
}

/**
 * Registra/substitui a mídia canônica destacada (capa de imagem, ou um
 * vídeo) via RPC transacional (replace_featured_venue_media) — nunca
 * manipula venue_media direto do cliente. A RPC insere/reativa a mídia
 * NOVA primeiro e só depois retira o destaque da anterior (nunca a linha
 * recém-(re)ativada), então o estabelecimento nunca fica sem mídia se algo
 * falhar no meio do caminho. Sujeita ao limite de vídeo do plano no banco.
 */
export async function upsertFeaturedVenueMedia(
  venueId: string,
  mediaType: MediaKind,
  url: string,
  isFeatured = true,
): Promise<{ error: string } | null> {
  const supabase = createClient();
  const { error } = await supabase.rpc("replace_featured_venue_media", {
    p_venue_id: venueId,
    p_media_type: mediaType,
    p_url: url,
    p_is_featured: isFeatured,
  });

  if (error) {
    return { error: error.message.includes("vídeo") ? error.message : "Não foi possível registrar a mídia do estabelecimento agora." };
  }

  return null;
}

/** Retira (soft delete) uma mídia canônica específica — via RPC, nunca DELETE direto. */
export async function retireVenueMediaItem(mediaId: string): Promise<{ error: string } | null> {
  const supabase = createClient();
  const { error } = await supabase.rpc("retire_venue_media", { p_media_id: mediaId });
  if (error) {
    return { error: "Não foi possível atualizar a mídia do estabelecimento agora." };
  }
  return null;
}

/** Alterna destaque de uma mídia canônica já existente — via RPC (imagem: só uma capa por vez; vídeo: independente). */
export async function setVenueMediaFeatured(mediaId: string, featured: boolean): Promise<{ error: string } | null> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_venue_media_featured", {
    p_media_id: mediaId,
    p_featured: featured,
  });
  if (error) {
    return { error: "Não foi possível atualizar o destaque agora. Tente novamente." };
  }
  return null;
}

/** Retira (soft delete) a mídia destacada ativa do tipo informado — usada quando o dono remove a capa (compatibilidade com o slot único). */
export async function retireFeaturedVenueMedia(
  venueId: string,
  mediaType: MediaKind,
): Promise<{ error: string } | null> {
  const items = await listVenueMedia(venueId, mediaType);
  const featured = items.find((item) => item.isFeatured);
  if (!featured) return null;
  return retireVenueMediaItem(featured.id);
}
