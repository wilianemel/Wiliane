"use client";

import { useState } from "react";

interface VenueVideoPlayerProps {
  videoUrl: string;
  venueName: string;
  /** Reaproveita o mesmo gradiente do local para o estado de erro, sem depender de foto real. */
  gradient: string;
}

export function VenueVideoPlayer({ videoUrl, venueName, gradient }: VenueVideoPlayerProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        aria-hidden="true"
        className={`aspect-video rounded-2xl bg-gradient-to-br ${gradient}`}
      />
    );
  }

  return (
    <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black">
      <video
        className="h-full w-full object-contain"
        controls
        playsInline
        muted
        preload="metadata"
        aria-label={`Vídeo do estabelecimento ${venueName}`}
        onError={() => setHasError(true)}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
}
