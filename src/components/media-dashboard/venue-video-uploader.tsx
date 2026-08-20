"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { validateMediaFile } from "@/lib/venues/venue-media";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface VenueVideoUploaderProps {
  venueName: string;
}

/**
 * Seleção e pré-visualização local de um vídeo, sem enviar nada ainda.
 * O envio definitivo (para o Supabase Storage) é a próxima etapa.
 */
export function VenueVideoUploader({ venueName }: VenueVideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetSelection() {
    setFile(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(candidate: File) {
    // Mesma validação de formato/tamanho do upload real (venue-media.ts) —
    // nunca duplicada, só reaproveitada, pra nunca divergir do fluxo que de
    // fato envia ao Storage. HEVC/H.265 é aceito aqui pra pré-visualização,
    // mas alguns navegadores podem não conseguir reproduzi-lo sem conversão
    // (mesma ressalva do upload real).
    const validationError = validateMediaFile(candidate, "video");
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setFile(candidate);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(candidate);
    });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const candidate = event.target.files?.[0];
    if (candidate) handleFile(candidate);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const candidate = event.dataTransfer.files?.[0];
    if (candidate) handleFile(candidate);
  }

  return (
    <div className="rounded-2xl border border-border bg-background-elevated p-5">
      <h3 className="text-sm font-semibold text-foreground">Enviar vídeo</h3>
      <p className="mt-1 text-sm text-muted">
        Envie um vídeo de {venueName} em MP4, WebM, MOV ou HEVC/H.265, com até 100 MB e 60
        segundos.
      </p>

      {!file ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            isDragging ? "border-accent bg-accent/5" : "border-border"
          }`}
        >
          <p className="text-sm text-muted">Arraste um vídeo até aqui ou</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
          >
            Selecionar vídeo
          </button>
          <label htmlFor="venue-video-input" className="sr-only">
            Selecionar arquivo de vídeo
          </label>
          <input
            id="venue-video-input"
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/hevc,video/h265,video/x-h265,.hevc,.h265"
            onChange={handleInputChange}
            className="sr-only"
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
            {previewUrl && (
              <video
                src={previewUrl}
                controls
                playsInline
                muted
                preload="metadata"
                className="h-full w-full object-contain"
                aria-label={`Pré-visualização do vídeo selecionado para ${venueName}`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-muted">{formatFileSize(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={resetSelection}
              className={`text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-accent hover:underline rounded ${focusRing}`}
            >
              Cancelar seleção
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">O envio definitivo será ativado na próxima etapa.</p>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Envio ativado na próxima etapa"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground opacity-40 disabled:cursor-not-allowed"
        >
          Enviar vídeo
        </button>
      </div>
    </div>
  );
}
