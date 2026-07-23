import type { DashboardRole, MediaOrigin, MediaStatus, VenueMedia } from "@/lib/media-dashboard/types";

const ORIGIN_LABELS: Record<MediaOrigin, string> = {
  painel: "Enviado pelo painel",
  instagram: "Instagram",
  admin: "Administrador",
};

const STATUS_LABELS: Record<MediaStatus, string> = {
  published: "Publicado",
  pending: "Aguardando aprovação",
  hidden: "Oculto",
};

const STATUS_STYLES: Record<MediaStatus, string> = {
  published: "border-emerald-400/40 text-emerald-300",
  pending: "border-accent/50 text-accent",
  hidden: "border-border text-muted",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function formatDate(value: string): string {
  // Datas puras ("AAAA-MM-DD") precisam de horário explícito para não
  // "voltar" um dia ao converter de UTC para o fuso do navegador; timestamps
  // completos vindos do banco já trazem essa informação.
  const hasTime = value.includes("T");
  const parsed = new Date(hasTime ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

interface MediaCardProps {
  media: VenueMedia;
  role: DashboardRole;
  isFirst: boolean;
  isLast: boolean;
  onSetPrimary: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onRequestDelete: (media: VenueMedia) => void;
}

export function MediaCard({
  media,
  role,
  isFirst,
  isLast,
  onSetPrimary,
  onMoveUp,
  onMoveDown,
  onToggleHidden,
  onRequestDelete,
}: MediaCardProps) {
  const buttonClasses = `rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-background-elevated p-4 sm:flex-row">
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-black sm:w-56">
        {media.videoUrl ? (
          <video
            src={media.videoUrl}
            controls
            playsInline
            muted
            preload="metadata"
            className="h-full w-full object-contain"
            aria-label={`Vídeo: ${media.title}`}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${media.gradient} px-3 text-center`}
          >
            <span className="text-xs text-foreground/70">Pré-visualização demonstrativa</span>
          </div>
        )}
        {media.isPrimary && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
            Vídeo principal
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{media.title}</h3>
            <p className="mt-0.5 text-xs text-muted">
              {ORIGIN_LABELS[media.origin]} · {formatDate(media.uploadedAt)} · {media.uploadedBy}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[media.status]}`}
          >
            {STATUS_LABELS[media.status]}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => onSetPrimary(media.id)}
            disabled={media.isPrimary}
            className={buttonClasses}
          >
            Definir como principal
          </button>
          <button
            type="button"
            onClick={() => onMoveUp(media.id)}
            disabled={isFirst}
            className={buttonClasses}
          >
            Mover para cima
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(media.id)}
            disabled={isLast}
            className={buttonClasses}
          >
            Mover para baixo
          </button>
          {role === "admin" && (
            <button type="button" onClick={() => onToggleHidden(media.id)} className={buttonClasses}>
              {media.status === "hidden" ? "Reexibir" : "Ocultar"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onRequestDelete(media)}
            className={`rounded-full border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-400/10 ${focusRing}`}
          >
            Excluir
          </button>
        </div>
      </div>
    </article>
  );
}
