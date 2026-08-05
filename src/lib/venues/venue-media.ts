"use client";

import { createClient } from "@/lib/supabase/client";

export const MEDIA_BUCKET = "venue-media";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;

/** Mesmo teto configurado no bucket venue-media (50 MB) — validado aqui só para feedback rápido; a aplicação real do limite é no servidor. */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_GALLERY_IMAGES = 8;

export type MediaKind = "image" | "video";

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
 * Slots de mídia únicos (capa, logo, vídeo): sempre substitui — remove
 * qualquer arquivo já existente na pasta antes de enviar o novo, para
 * nunca deixar arquivo órfão de uma extensão anterior.
 */
export async function replaceSingleMedia(
  venueId: string,
  folder: "cover" | "logo" | "video",
  file: File,
): Promise<{ url: string } | { error: string }> {
  const supabase = createClient();
  const prefix = `${venueId}/${folder}`;

  const { data: existing } = await supabase.storage.from(MEDIA_BUCKET).list(prefix);
  if (existing && existing.length > 0) {
    await supabase.storage.from(MEDIA_BUCKET).remove(existing.map((item) => `${prefix}/${item.name}`));
  }

  const path = `${prefix}/${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    return { error: "Não foi possível enviar o arquivo agora. Tente novamente." };
  }

  return { url: getMediaPublicUrl(path) };
}

export async function removeSingleMedia(
  venueId: string,
  folder: "cover" | "logo" | "video",
): Promise<{ error: string } | null> {
  const supabase = createClient();
  const prefix = `${venueId}/${folder}`;
  const { data: existing } = await supabase.storage.from(MEDIA_BUCKET).list(prefix);

  if (existing && existing.length > 0) {
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .remove(existing.map((item) => `${prefix}/${item.name}`));
    if (error) {
      return { error: "Não foi possível remover o arquivo agora. Tente novamente." };
    }
  }

  return null;
}

export interface GalleryItem {
  name: string;
  url: string;
}

export async function listGalleryItems(venueId: string): Promise<GalleryItem[]> {
  const supabase = createClient();
  const prefix = `${venueId}/gallery`;
  const { data } = await supabase.storage.from(MEDIA_BUCKET).list(prefix, {
    sortBy: { column: "created_at", order: "desc" },
  });

  return (data ?? [])
    .filter((item) => item.name && !item.name.endsWith("/"))
    .map((item) => ({ name: item.name, url: getMediaPublicUrl(`${prefix}/${item.name}`) }));
}

export async function uploadGalleryImage(
  venueId: string,
  file: File,
): Promise<{ item: GalleryItem } | { error: string }> {
  const supabase = createClient();
  const prefix = `${venueId}/gallery`;

  const current = await listGalleryItems(venueId);
  if (current.length >= MAX_GALLERY_IMAGES) {
    return { error: `Limite de ${MAX_GALLERY_IMAGES} imagens na galeria atingido.` };
  }

  const path = `${prefix}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
  });

  if (error) {
    return { error: "Não foi possível enviar a imagem agora. Tente novamente." };
  }

  return { item: { name: path.split("/").pop() as string, url: getMediaPublicUrl(path) } };
}

export async function removeGalleryImage(venueId: string, fileName: string): Promise<{ error: string } | null> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([`${venueId}/gallery/${fileName}`]);
  if (error) {
    return { error: "Não foi possível remover a imagem agora. Tente novamente." };
  }
  return null;
}
