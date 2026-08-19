"use client";

import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, MAX_FILE_SIZE_BYTES } from "./venue-media";

export type ClaimDraftMediaType = "image" | "video";

export interface ClaimDraftMediaItem {
  id: string;
  url: string;
  storagePath: string;
  mediaType: ClaimDraftMediaType;
  title: string | null;
  isFeatured: boolean;
}

interface ClaimDraftMediaRow {
  id: string;
  url: string;
  storage_path: string;
  media_type: ClaimDraftMediaType;
  title: string | null;
  is_featured: boolean;
}

function mapRow(row: ClaimDraftMediaRow): ClaimDraftMediaItem {
  return {
    id: row.id,
    url: row.url,
    storagePath: row.storage_path,
    mediaType: row.media_type,
    title: row.title,
    isFeatured: row.is_featured,
  };
}

export function validateClaimDraftMediaFile(file: File, kind: ClaimDraftMediaType): string | null {
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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return cleaned || "arquivo";
}

export async function listClaimDraftMedia(draftId: string): Promise<ClaimDraftMediaItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("venue_claim_draft_media")
    .select("id, url, storage_path, media_type, title, is_featured")
    // Mídia retirada (is_active = false, ex.: evitada pelo limite de vídeo
    // do plano) nunca aparece na lista, na contagem nem no upload seguinte.
    .eq("draft_id", draftId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("CLAIM DRAFT MEDIA LIST ERROR:", error);
    return [];
  }

  return (data ?? []).map((row) => mapRow(row as ClaimDraftMediaRow));
}

/**
 * Envia o arquivo para storage.objects em
 * <venue_id>/claim-draft/<claim_request_id>/<arquivo> (nunca nas pastas
 * cover/logo/video/gallery do dono já aprovado — RLS de storage só libera
 * esse path para quem tem rascunho ativo, ver migration
 * 20260818220256_simplify_existing_venue_onboarding.sql) e registra a
 * linha em venue_claim_draft_media. Reenvio do mesmo arquivo (mesmo
 * storage_path) nunca duplica a linha — upsert por (draft_id, storage_path).
 */
export async function uploadClaimDraftMedia(
  venueId: string,
  claimRequestId: string,
  draftId: string,
  file: File,
  mediaType: ClaimDraftMediaType,
): Promise<{ item: ClaimDraftMediaItem } | { error: string }> {
  const supabase = createClient();
  const path = `${venueId}/claim-draft/${claimRequestId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
  });

  if (uploadError) {
    return { error: "Não foi possível enviar o arquivo agora. Tente novamente." };
  }

  const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("venue_claim_draft_media")
    .upsert(
      {
        draft_id: draftId,
        url: publicUrlData.publicUrl,
        storage_path: path,
        media_type: mediaType,
        title: null,
        is_featured: false,
      },
      { onConflict: "draft_id,storage_path" },
    )
    .select("id, url, storage_path, media_type, title, is_featured")
    .single();

  if (error || !data) {
    return { error: "Arquivo enviado, mas não foi possível registrá-lo agora. Tente novamente." };
  }

  return { item: mapRow(data as ClaimDraftMediaRow) };
}

/**
 * Soft delete: marca is_active=false/retired_at=now(), nunca DELETE na
 * tabela nem remoção física do arquivo no fluxo normal — preserva pra
 * recuperação/auditoria. A listagem (listClaimDraftMedia) já filtra
 * is_active=true, então o item some da tela imediatamente mesmo sem
 * apagar nada de verdade.
 */
export async function removeClaimDraftMedia(item: ClaimDraftMediaItem): Promise<{ error: string } | null> {
  const supabase = createClient();

  const { error } = await supabase
    .from("venue_claim_draft_media")
    .update({ is_active: false, retired_at: new Date().toISOString() })
    .eq("id", item.id);

  if (error) {
    return { error: "Não foi possível remover o arquivo agora. Tente novamente." };
  }

  return null;
}

/**
 * Capa (imagem) e destaque de vídeo são conceitos separados: só uma
 * imagem ativa pode ser a capa do rascunho (marcar uma desmarca as outras
 * IMAGENS, nunca vídeos); vídeos têm destaque independente entre si —
 * vários podem estar destacados ao mesmo tempo (relevante pro plano
 * partner, com até 20 vídeos). `featured=false` só desmarca o próprio
 * item, sem afetar mais nada.
 *
 * Via RPC transacional (set_venue_claim_draft_media_featured) — nunca
 * dois UPDATEs separados do cliente, que deixariam uma janela sem
 * nenhuma capa se o segundo UPDATE falhasse depois do primeiro ter
 * desmarcado a imagem anterior.
 */
export async function setClaimDraftMediaFeatured(
  item: ClaimDraftMediaItem,
  featured: boolean,
): Promise<{ error: string } | null> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_venue_claim_draft_media_featured", {
    p_media_id: item.id,
    p_featured: featured,
  });

  if (error) {
    return { error: "Não foi possível atualizar o destaque agora. Tente novamente." };
  }

  return null;
}
