import type { VenueMedia } from "@/lib/media-dashboard/types";

interface MediaSummaryProps {
  media: VenueMedia[];
}

export function MediaSummary({ media }: MediaSummaryProps) {
  const total = media.length;
  const primary = media.find((item) => item.isPrimary);
  const pendingCount = media.filter((item) => item.status === "pending").length;

  const statusText =
    total === 0
      ? "Nenhum vídeo cadastrado ainda."
      : pendingCount > 0
        ? `${pendingCount} ${pendingCount === 1 ? "vídeo aguardando aprovação" : "vídeos aguardando aprovação"}.`
        : "Todas as mídias estão em dia.";

  return (
    <section className="grid grid-cols-1 gap-5 rounded-2xl border border-border bg-background-elevated p-5 sm:grid-cols-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Vídeos cadastrados
        </p>
        <p className="mt-1 text-2xl font-bold text-foreground">{total}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Vídeo principal
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {primary ? primary.title : "Nenhum vídeo definido ainda"}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status geral</p>
        <p className="mt-1 text-sm font-medium text-foreground">{statusText}</p>
      </div>
    </section>
  );
}
