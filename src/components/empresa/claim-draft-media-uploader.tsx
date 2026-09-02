"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  listClaimDraftMedia,
  uploadClaimDraftMedia,
  removeClaimDraftMedia,
  setClaimDraftMediaFeatured,
  validateClaimDraftMediaFile,
  type ClaimDraftMediaItem,
  type ClaimDraftMediaType,
} from "@/lib/venues/claim-draft-media";
import { getVenueEffectiveLimits, validateVideoDuration } from "@/lib/venues/venue-media";
import { UpgradeToBasicoNotice } from "@/components/empresa/upgrade-to-basico-cta";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const buttonBase = `rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

type Status = "idle" | "busy" | "error";

interface ClaimDraftMediaUploaderProps {
  venueId: string;
  claimRequestId: string;
  draftId: string;
  /** false quando a solicitação não está mais editável — some os controles de envio/remoção, mantém só a visualização. */
  editable: boolean;
  /** Notifica a lista completa a cada mudança — quem chama deriva contagem/capa/vídeo pro checklist de publicação. */
  onItemsChange?: (items: ClaimDraftMediaItem[]) => void;
}

/**
 * Fotos e vídeos do rascunho — envia para
 * <venue_id>/claim-draft/<claim_request_id>/... (nunca as pastas
 * cover/logo/video/gallery do dono já aprovado) e registra em
 * venue_claim_draft_media. Só vira mídia pública de fato quando
 * approve_venue_claim() consolida em venue_media.
 */
export function ClaimDraftMediaUploader({
  venueId,
  claimRequestId,
  draftId,
  editable,
  onItemsChange,
}: ClaimDraftMediaUploaderProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ClaimDraftMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageLimit, setImageLimit] = useState<number | null>(null);
  const [videoLimit, setVideoLimit] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listClaimDraftMedia(draftId), getVenueEffectiveLimits(venueId)]).then(
      ([loaded, limits]) => {
        if (cancelled) return;
        setItems(loaded);
        setImageLimit(limits.imageLimit);
        setVideoLimit(limits.videoLimit);
        setLoading(false);
        onItemsChange?.(loaded);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, venueId]);

  const imageCount = items.filter((item) => item.mediaType === "image").length;
  const videoCount = items.filter((item) => item.mediaType === "video").length;
  const imageAtLimit = imageLimit !== null && imageCount >= imageLimit;
  const videoAtLimit = videoLimit !== null && videoCount >= videoLimit;

  async function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>,
    mediaType: ClaimDraftMediaType,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateClaimDraftMediaFile(file, mediaType);
    if (validationError) {
      setErrorMessage(validationError);
      setStatus("error");
      return;
    }

    // Duração real (limite de 60s) — só se aplica a vídeo, checada no
    // navegador antes de qualquer envio; nunca imposta pelo banco. Pulada
    // (sem bloquear) se o navegador não conseguir ler os metadados (comum
    // com HEVC/H.265 sem suporte de decodificação) — ver validateVideoDuration.
    if (mediaType === "video") {
      const durationError = await validateVideoDuration(file);
      if (durationError) {
        setErrorMessage(durationError);
        setStatus("error");
        return;
      }
    }

    // Checagem local só para feedback rápido — a autoridade real do limite
    // é o gatilho do banco (mesma regra de vídeo, agora também para imagem).
    if (mediaType === "image" && imageAtLimit) {
      setErrorMessage(`Seu plano atual permite só ${imageLimit} foto${imageLimit === 1 ? "" : "s"}.`);
      setStatus("error");
      return;
    }
    if (mediaType === "video" && videoAtLimit) {
      setErrorMessage(`Seu plano atual permite só ${videoLimit} vídeo${videoLimit === 1 ? "" : "s"}.`);
      setStatus("error");
      return;
    }

    setStatus("busy");
    setErrorMessage(null);

    const result = await uploadClaimDraftMedia(venueId, claimRequestId, draftId, file, mediaType);
    if ("error" in result) {
      setErrorMessage(result.error);
      setStatus("error");
      return;
    }

    setItems((current) => {
      const next = [...current, result.item];
      onItemsChange?.(next);
      return next;
    });
    setStatus("idle");
  }

  async function handleRemove(item: ClaimDraftMediaItem) {
    setStatus("busy");
    setErrorMessage(null);

    const result = await removeClaimDraftMedia(item);
    if (result) {
      setErrorMessage(result.error);
      setStatus("error");
      return;
    }

    setItems((current) => {
      const next = current.filter((existing) => existing.id !== item.id);
      onItemsChange?.(next);
      return next;
    });
    setStatus("idle");
  }

  async function handleToggleFeatured(item: ClaimDraftMediaItem, featured: boolean) {
    setStatus("busy");
    setErrorMessage(null);

    const result = await setClaimDraftMediaFeatured(item, featured);
    if (result) {
      setErrorMessage(result.error);
      setStatus("error");
      return;
    }

    // Imagem: destacar uma desmarca as outras imagens (nunca vídeos).
    // Vídeo: só o próprio item muda, os demais continuam como estavam —
    // vários vídeos podem ficar destacados ao mesmo tempo.
    setItems((current) => {
      const next = current.map((existing) => {
        if (existing.id === item.id) return { ...existing, isFeatured: featured };
        if (item.mediaType === "image" && featured && existing.mediaType === "image") {
          return { ...existing, isFeatured: false };
        }
        return existing;
      });
      onItemsChange?.(next);
      return next;
    });
    setStatus("idle");
  }

  return (
    <section className="rounded-2xl border border-border bg-background-elevated p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Fotos e vídeos</h2>
          <p className="mt-1 text-xs text-muted">
            JPG, PNG, WebP ou HEIC/HEIF (até 50 MB); MP4, WebM ou HEVC/H.265 (até 100 MB e 60
            segundos).{" "}
            {imageLimit === null || videoLimit === null
              ? "Carregando limite do plano..."
              : `${imageCount}/${imageLimit} foto${imageLimit === 1 ? "" : "s"}, ${videoCount}/${videoLimit} vídeo${videoLimit === 1 ? "" : "s"}.`}
          </p>
        </div>

        {editable && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={status === "busy" || imageLimit === null || imageAtLimit}
              className={buttonBase}
            >
              {status === "busy" ? "Enviando..." : "Adicionar foto"}
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={status === "busy" || videoLimit === null || videoAtLimit}
              className={buttonBase}
            >
              Adicionar vídeo
            </button>
          </div>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={(event) => handleFileSelected(event, "image")}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/hevc,video/h265,video/x-h265,.hevc,.h265"
          onChange={(event) => handleFileSelected(event, "video")}
          className="hidden"
        />
      </div>

      {errorMessage && (
        <p className="mt-3 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-2 text-xs text-red-300">
          {errorMessage}
        </p>
      )}

      {(imageAtLimit || videoAtLimit) && <UpgradeToBasicoNotice className="mt-3" />}

      {loading ? (
        <p className="mt-4 text-xs text-muted">Carregando mídia...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-xs text-muted">Nenhuma foto ou vídeo enviado ainda.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`relative aspect-[9/16] overflow-hidden rounded-xl border ${
                item.isFeatured ? "border-accent" : "border-border"
              }`}
            >
              {item.mediaType === "image" ? (
                <Image src={item.url} alt="Mídia do rascunho" fill sizes="200px" className="object-cover" />
              ) : (
                <video src={item.url} muted className="h-full w-full bg-black object-cover" />
              )}

              {item.isFeatured && (
                <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  {item.mediaType === "image" ? "Capa" : "Destacado"}
                </span>
              )}

              {editable && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/70 p-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(item, !item.isFeatured)}
                    disabled={status === "busy"}
                    className="min-h-8 rounded-full px-2 text-[10px] font-medium text-white disabled:cursor-not-allowed"
                  >
                    {item.isFeatured
                      ? "Remover destaque"
                      : item.mediaType === "image"
                        ? "Definir como capa"
                        : "Destacar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    disabled={status === "busy"}
                    className="ml-auto inline-flex min-h-8 items-center justify-center rounded-full px-2 text-[10px] font-medium text-white disabled:cursor-not-allowed"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
