import type { VenueMedia } from "@/lib/media-dashboard/types";

interface DeleteMediaDialogProps {
  media: VenueMedia;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteMediaDialog({ media, onCancel, onConfirm }: DeleteMediaDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-media-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background-elevated p-6 shadow-[0_0_45px_-18px_rgba(255,194,30,0.35)]">
        <h2 id="delete-media-title" className="text-lg font-semibold text-foreground">
          Excluir vídeo?
        </h2>
        <p className="mt-2 text-sm text-muted">
          Você está prestes a excluir{" "}
          <strong className="font-semibold text-foreground">{media.title}</strong>. Essa ação
          não poderá ser desfeita.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Excluir vídeo
          </button>
        </div>
      </div>
    </div>
  );
}
