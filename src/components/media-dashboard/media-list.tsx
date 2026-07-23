import type { DashboardRole, VenueMedia } from "@/lib/media-dashboard/types";
import { MediaCard } from "./media-card";

interface MediaListProps {
  media: VenueMedia[];
  role: DashboardRole;
  onSetPrimary: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onRequestDelete: (media: VenueMedia) => void;
}

export function MediaList({
  media,
  role,
  onSetPrimary,
  onMoveUp,
  onMoveDown,
  onToggleHidden,
  onRequestDelete,
}: MediaListProps) {
  if (media.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-background-elevated p-8 text-center text-sm text-muted">
        Nenhum vídeo cadastrado ainda para este estabelecimento.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {media.map((item, index) => (
        <MediaCard
          key={item.id}
          media={item}
          role={role}
          isFirst={index === 0}
          isLast={index === media.length - 1}
          onSetPrimary={onSetPrimary}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onToggleHidden={onToggleHidden}
          onRequestDelete={onRequestDelete}
        />
      ))}
    </div>
  );
}
