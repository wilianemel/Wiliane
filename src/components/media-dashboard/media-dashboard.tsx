"use client";

import { useMemo, useState } from "react";
import type { Venue } from "@/data/venues";
import type { DashboardRole, VenueMedia } from "@/lib/media-dashboard/types";
import { buildDemoMedia } from "@/lib/media-dashboard/demo-data";
import { MediaDashboardHeader } from "./media-dashboard-header";
import { MediaSummary } from "./media-summary";
import { VenueVideoUploader } from "./venue-video-uploader";
import { InstagramImportCard } from "./instagram-import-card";
import { MediaList } from "./media-list";
import { DeleteMediaDialog } from "./delete-media-dialog";
import { VenueSelector } from "./venue-selector";

/**
 * Papel demonstrativo desta etapa: sem autenticação real, o papel é apenas
 * um estado local da página. Troque `DEFAULT_ROLE` para "owner" para
 * simular o proprietário sem o alternador de teste abaixo.
 */
const DEFAULT_ROLE: DashboardRole = "admin";
const INITIAL_VENUE_SLUG = "garagem-do-espeto";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface MediaDashboardProps {
  venues: Venue[];
}

export function MediaDashboard({ venues }: MediaDashboardProps) {
  const [role, setRole] = useState<DashboardRole>(DEFAULT_ROLE);
  const [selectedSlug, setSelectedSlug] = useState(INITIAL_VENUE_SLUG);
  const [mediaByVenue, setMediaByVenue] = useState<Record<string, VenueMedia[]>>(() => {
    const initial: Record<string, VenueMedia[]> = {};
    for (const venue of venues) {
      initial[venue.id] = buildDemoMedia(venue);
    }
    return initial;
  });
  const [deleteTarget, setDeleteTarget] = useState<VenueMedia | null>(null);

  const selectedVenue = venues.find((venue) => venue.id === selectedSlug) ?? venues[0];
  const media = mediaByVenue[selectedVenue.id] ?? [];

  const venueOptions = useMemo(
    () => venues.map((venue) => ({ slug: venue.id, name: venue.name, category: venue.category })),
    [venues],
  );

  function updateMedia(updater: (current: VenueMedia[]) => VenueMedia[]) {
    setMediaByVenue((current) => ({
      ...current,
      [selectedVenue.id]: updater(current[selectedVenue.id] ?? []),
    }));
  }

  function handleSetPrimary(id: string) {
    updateMedia((current) => current.map((item) => ({ ...item, isPrimary: item.id === id })));
  }

  function handleMoveUp(id: string) {
    updateMedia((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index <= 0) return current;
      const next = [...current];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function handleMoveDown(id: string) {
    updateMedia((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index === -1 || index >= current.length - 1) return current;
      const next = [...current];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function handleToggleHidden(id: string) {
    updateMedia((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "hidden" ? "published" : "hidden" }
          : item,
      ),
    );
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    updateMedia((current) => current.filter((item) => item.id !== target.id));
    setDeleteTarget(null);
  }

  function selectRole(nextRole: DashboardRole) {
    setRole(nextRole);
    if (nextRole === "owner") {
      setSelectedSlug(INITIAL_VENUE_SLUG);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-background-elevated px-4 py-2 text-xs text-muted">
        <span className="font-semibold uppercase tracking-wide text-accent">Modo de teste</span>
        <span>Visualizando como:</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => selectRole("admin")}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${focusRing} ${
              role === "admin"
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-accent"
            }`}
          >
            Administrador
          </button>
          <button
            type="button"
            onClick={() => selectRole("owner")}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${focusRing} ${
              role === "owner"
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-accent"
            }`}
          >
            Proprietário
          </button>
        </div>
      </div>

      <MediaDashboardHeader venueName={selectedVenue.name} role={role} />

      {role === "admin" && (
        <div className="mt-6">
          <VenueSelector
            options={venueOptions}
            selectedSlug={selectedVenue.id}
            onChange={setSelectedSlug}
          />
          <p className="mt-2 text-xs text-muted">
            Visualização administrativa: você pode gerenciar mídias de qualquer estabelecimento.
          </p>
        </div>
      )}

      <div className="mt-6">
        <MediaSummary media={media} />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <VenueVideoUploader venueName={selectedVenue.name} />
        <InstagramImportCard />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Vídeos cadastrados
        </h2>
        <MediaList
          media={media}
          role={role}
          onSetPrimary={handleSetPrimary}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onToggleHidden={handleToggleHidden}
          onRequestDelete={setDeleteTarget}
        />
      </div>

      {deleteTarget && (
        <DeleteMediaDialog
          media={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
