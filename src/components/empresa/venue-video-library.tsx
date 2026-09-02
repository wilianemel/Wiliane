"use client";

import { useEffect, useRef, useState } from "react";
import {
  validateMediaFile,
  validateVideoDuration,
  replaceSingleMedia,
  listVenueMedia,
  upsertFeaturedVenueMedia,
  setVenueMediaFeatured,
  retireVenueMediaItem,
  getVenueVideoLimit,
  verifyVenueUploadAccess,
  type VenueMediaListItem,
} from "@/lib/venues/venue-media";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const buttonBase = `rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

type Status = "idle" | "busy" | "error";

/**
 * Gerenciador de vídeos do estabelecimento já aprovado — free permite 1,
 * partner até 20 (venue_plan_definitions). O limite exibido aqui é só
 * informativo: a autoridade real é o gatilho de limite de vídeo no banco
 * (SEÇÃO 3E da migration), que bloqueia/retira o mais antigo não
 * destacado sozinho quando o teto é excedido — este componente só reflete
 * o resultado e mostra a mensagem de erro se o banco recusar.
 */
interface VenueVideoLibraryProps {
  venueId: string;
  /** Âncora opcional (ex.: "video") pra abrir o painel já rolado até esta seção — ver checklist de publicação. */
  id?: string;
}

export function VenueVideoLibrary({ venueId, id }: VenueVideoLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<VenueMediaListItem[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function reload(showLoading = false) {
    if (showLoading) setLoading(true);
    const [videos, videoLimit] = await Promise.all([
      listVenueMedia(venueId, "video"),
      getVenueVideoLimit(venueId),
    ]);
    setItems(videos);
    setLimit(videoLimit);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([listVenueMedia(venueId, "video"), getVenueVideoLimit(venueId)]).then(
      ([videos, videoLimit]) => {
        if (cancelled) return;
        setItems(videos);
        setLimit(videoLimit);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateMediaFile(file, "video");
    if (validationError) {
      setErrorMessage(validationError);
      setStatus("error");
      return;
    }

    setStatus("busy");
    setErrorMessage(null);

    // Duração real (limite de 60s) — checada no navegador antes de
    // qualquer envio; nunca imposta pelo banco. Pulada (sem bloquear) se o
    // navegador não conseguir ler os metadados (comum com HEVC/H.265 sem
    // suporte de decodificação nesta plataforma) — ver validateVideoDuration.
    const durationError = await validateVideoDuration(file);
    if (durationError) {
      setErrorMessage(durationError);
      setStatus("error");
      return;
    }

    // Reconfirma sessão + vínculo ativo bem antes de tocar no Storage —
    // nunca deixa a RPC de escrita ser a primeira a avisar (e nunca com um
    // erro genérico). Cobre o caso do vínculo ter sido removido enquanto
    // o painel já estava aberto (VenueAccessGate só checa uma vez, ao
    // carregar a página).
    const access = await verifyVenueUploadAccess(venueId);
    if (!access.ok) {
      setErrorMessage(access.error);
      setStatus("error");
      return;
    }

    const uploadResult = await replaceSingleMedia(venueId, "video", file);
    if ("error" in uploadResult) {
      setErrorMessage(uploadResult.error);
      setStatus("error");
      return;
    }

    // Novo vídeo entra sem destaque por padrão — não mexe no vídeo já
    // destacado, se houver. O banco aplica o limite do plano sozinho
    // (bloqueia ou retira o mais antigo não destacado); se recusar, o
    // erro vem daqui.
    const mediaError = await upsertFeaturedVenueMedia(venueId, "video", uploadResult.url, false);
    if (mediaError) {
      setErrorMessage(mediaError.error);
      setStatus("error");
      return;
    }

    await reload();
    setStatus("idle");
  }

  async function handleToggleFeatured(item: VenueMediaListItem) {
    setStatus("busy");
    setErrorMessage(null);

    const result = await setVenueMediaFeatured(item.id, !item.isFeatured);
    if (result) {
      setErrorMessage(result.error);
      setStatus("error");
      return;
    }

    await reload();
    setStatus("idle");
  }

  async function handleRetire(item: VenueMediaListItem) {
    setStatus("busy");
    setErrorMessage(null);

    const result = await retireVenueMediaItem(item.id);
    if (result) {
      setErrorMessage(result.error);
      setStatus("error");
      return;
    }

    await reload();
    setStatus("idle");
  }

  // Free (limite 1): bloqueia assim que atinge o limite, sem exceção — só
  // 1 vídeo ativo por vez. Planos com limite maior (partner, 20): o banco
  // retira sozinho o vídeo não destacado mais antigo ao ultrapassar o
  // teto, então o envio continua permitido MESMO no limite, desde que
  // exista pelo menos um vídeo não destacado pra ceder o lugar — só
  // bloqueia de verdade quando TODOS os ativos já estão destacados (não
  // sobra ninguém pra retirar).
  const hasEvictableVideo = items.some((item) => !item.isFeatured);
  const atFreeLimit = limit !== null && limit <= 1 && items.length >= limit;
  const allFeaturedAtLimit =
    limit !== null && limit > 1 && items.length >= limit && !hasEvictableVideo;
  const uploadBlocked = atFreeLimit || allFeaturedAtLimit;

  return (
    <section id={id} className="rounded-2xl border border-border bg-background-elevated p-5 scroll-mt-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Vídeos</h2>
          <p className="mt-1 text-xs text-muted">
            MP4, WebM ou HEVC/H.265, até 100 MB e 60 segundos. HEVC pode não reproduzir em
            todos os navegadores sem conversão. Nunca inicia automaticamente com som na
            página pública.
            {limit !== null && (
              <>
                {" "}
                {items.length}/{limit} usados.
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "busy" || uploadBlocked}
          className={buttonBase}
        >
          {status === "busy" ? "Enviando..." : "Adicionar vídeo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/hevc,video/h265,video/x-h265,.hevc,.h265"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>

      {atFreeLimit && (
        <p className="mt-3 text-xs text-muted">
          Seu plano permite só 1 vídeo. Retire o vídeo atual para enviar outro.
        </p>
      )}
      {allFeaturedAtLimit && (
        <p className="mt-3 text-xs text-muted">
          Limite de {limit} vídeos atingido e todos estão destacados. Remova o destaque de algum
          para enviar outro — o mais antigo não destacado é retirado automaticamente para abrir
          espaço.
        </p>
      )}

      {errorMessage && (
        <p className="mt-3 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-2 text-xs text-red-300">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-xs text-muted">Carregando vídeos...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-xs text-muted">Nenhum vídeo enviado ainda.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`relative aspect-[9/16] overflow-hidden rounded-xl border ${
                item.isFeatured ? "border-accent" : "border-border"
              }`}
            >
              <video src={item.url} muted className="h-full w-full bg-black object-cover" />

              {item.isFeatured && (
                <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  Destacado
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/70 p-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleFeatured(item)}
                  disabled={status === "busy"}
                  className="min-h-8 rounded-full px-2 text-[10px] font-medium text-white disabled:cursor-not-allowed"
                >
                  {item.isFeatured ? "Remover destaque" : "Destacar"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRetire(item)}
                  disabled={status === "busy"}
                  className="ml-auto inline-flex min-h-8 items-center justify-center rounded-full px-2 text-[10px] font-medium text-white disabled:cursor-not-allowed"
                >
                  Retirar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
