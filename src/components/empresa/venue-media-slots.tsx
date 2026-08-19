"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  validateMediaFile,
  replaceSingleMedia,
  listGalleryItems,
  uploadGalleryImage,
  removeGalleryImage,
  upsertFeaturedVenueMedia,
  retireFeaturedVenueMedia,
  getVenueImageLimit,
  type GalleryItem,
} from "@/lib/venues/venue-media";
import { UpgradeToBasicoNotice } from "@/components/empresa/upgrade-to-basico-cta";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const buttonBase = `rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

type UploadStatus = "idle" | "uploading" | "error";

export interface SingleMediaSlotProps {
  venueId: string;
  folder: "cover" | "logo" | "video";
  kind: "image" | "video";
  title: string;
  description: string;
  currentUrl: string | null;
  urlColumn: "cover_image_url" | "logo_url" | "video_url";
  onVenueUpdated: () => void;
}

/**
 * Slot de mídia única (capa, logo ou vídeo) — reutilizado na página dedicada
 * de mídias (`/empresa/painel/[venueId]/midias`) e no bloco inline do
 * onboarding em `/empresa/painel`, para não duplicar a lógica de upload.
 */
export function SingleMediaSlot({
  venueId,
  folder,
  kind,
  title,
  description,
  currentUrl,
  urlColumn,
  onVenueUpdated,
}: SingleMediaSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateMediaFile(file, kind);
    if (validationError) {
      setErrorMessage(validationError);
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setErrorMessage(null);

    // Envia o arquivo NOVO com nome único — nunca no lugar do antigo.
    // CORREÇÃO (auditoria 3ª rodada): o arquivo anterior nunca é apagado
    // do Storage neste fluxo, nem antes nem depois da confirmação no
    // banco — fica só sem nenhuma linha ativa apontando pra ele.
    const result = await replaceSingleMedia(venueId, folder, file);
    if ("error" in result) {
      setErrorMessage(result.error);
      setStatus("error");
      return;
    }

    if (folder === "cover" || folder === "video") {
      // Capa/vídeo: uma única RPC transacional cuida de tudo — registra em
      // venue_media (canônica) E sincroniza venues.cover_image_url/
      // video_url na mesma transação. Nunca duas gravações separadas do
      // cliente (se a RPC falhar, nenhuma referência muda).
      const mediaError = await upsertFeaturedVenueMedia(venueId, kind, result.url);
      if (mediaError) {
        setErrorMessage(mediaError.error);
        setStatus("error");
        return;
      }
    } else {
      // Logo não faz parte de venue_media — continua só na coluna antiga.
      const supabase = createClient();
      const { error } = await supabase
        .from("venues")
        .update({ [urlColumn]: result.url })
        .eq("id", venueId);

      if (error) {
        setErrorMessage("Arquivo enviado, mas não foi possível vincular ao estabelecimento agora.");
        setStatus("error");
        return;
      }
    }

    setStatus("idle");
    onVenueUpdated();
  }

  async function handleRemove() {
    setStatus("uploading");
    setErrorMessage(null);

    if (folder === "cover" || folder === "video") {
      // Mesma RPC cuida de retirar (soft delete) a mídia canônica E limpar
      // cover_image_url/video_url na mesma transação. Nunca apaga o
      // arquivo do Storage.
      const mediaError = await retireFeaturedVenueMedia(venueId, kind);
      if (mediaError) {
        setErrorMessage(mediaError.error);
        setStatus("error");
        return;
      }
    } else {
      // Logo: só limpa a coluna antiga — o arquivo nunca é apagado do
      // Storage (CORREÇÃO — auditoria 3ª rodada).
      const supabase = createClient();
      const { error } = await supabase
        .from("venues")
        .update({ [urlColumn]: null })
        .eq("id", venueId);

      if (error) {
        setErrorMessage("Não foi possível atualizar o estabelecimento agora.");
        setStatus("error");
        return;
      }
    }

    setStatus("idle");
    onVenueUpdated();
  }

  return (
    <section className="rounded-2xl border border-border bg-background-elevated p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === "uploading"}
            className={buttonBase}
          >
            {status === "uploading" ? "Enviando..." : currentUrl ? "Substituir" : "Enviar"}
          </button>
          {currentUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={status === "uploading"}
              className={buttonBase}
            >
              Remover
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={kind === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm"}
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      {errorMessage && (
        <p className="mt-3 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-2 text-xs text-red-300">
          {errorMessage}
        </p>
      )}

      {currentUrl && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          {kind === "image" ? (
            <div className="relative h-40 w-full">
              <Image src={currentUrl} alt={title} fill sizes="600px" className="object-cover" />
            </div>
          ) : (
            <video src={currentUrl} controls muted className="h-40 w-full bg-black object-contain" />
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Galeria de imagens — mesmo motivo de extração do `SingleMediaSlot` acima.
 */
export function GallerySlot({ venueId }: { venueId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [imageLimit, setImageLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listGalleryItems(venueId), getVenueImageLimit(venueId)]).then(([loaded, limit]) => {
      if (!cancelled) {
        setItems(loaded);
        setImageLimit(limit);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || imageLimit === null) return;

    const validationError = validateMediaFile(file, "image");
    if (validationError) {
      setErrorMessage(validationError);
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setErrorMessage(null);

    const result = await uploadGalleryImage(venueId, file, imageLimit);
    if ("error" in result) {
      setErrorMessage(result.error);
      setStatus("error");
      return;
    }

    setItems((current) => [result.item, ...current]);
    setStatus("idle");
  }

  async function handleRemove(item: GalleryItem) {
    setStatus("uploading");
    setErrorMessage(null);

    // Soft delete em venue_media (adota a imagem primeiro se ela ainda só
    // existir no path antigo do Storage) — nunca apaga o arquivo.
    const result = await removeGalleryImage(venueId, item);
    if (result) {
      setErrorMessage(result.error);
      setStatus("error");
      return;
    }

    setItems((current) => current.filter((existing) => existing.name !== item.name));
    setStatus("idle");
  }

  const atLimit = imageLimit !== null && items.length >= imageLimit;

  return (
    <section className="rounded-2xl border border-border bg-background-elevated p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Galeria</h2>
          <p className="mt-1 text-xs text-muted">
            JPG, PNG ou WebP. {imageLimit === null
              ? "Carregando limite do plano..."
              : `Até ${imageLimit} imagem${imageLimit === 1 ? "" : "s"}. ${items.length}/${imageLimit} enviadas.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading" || imageLimit === null || atLimit}
          className={buttonBase}
        >
          {status === "uploading" ? "Enviando..." : "Adicionar imagem"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      {atLimit && (
        <UpgradeToBasicoNotice className="mt-4" />
      )}

      {errorMessage && (
        <p className="mt-3 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-2 text-xs text-red-300">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-xs text-muted">Carregando galeria...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-xs text-muted">Nenhuma imagem na galeria ainda.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.name} className="relative aspect-square overflow-hidden rounded-xl border border-border">
              <Image src={item.url} alt="Foto da galeria" fill sizes="200px" className="object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(item)}
                disabled={status === "uploading"}
                className="absolute right-2 top-2 inline-flex min-h-11 items-center justify-center rounded-full bg-black/80 px-3 text-xs font-medium text-white disabled:cursor-not-allowed"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
