"use client";

import { useState } from "react";
import Image from "next/image";
import type { Venue } from "@/data/venues";

/**
 * Imagem de capa de um estabelecimento, com fallback elegante quando não há
 * `coverImageUrl` real cadastrada (ou quando a URL cadastrada falha ao
 * carregar — link quebrado, arquivo removido do Storage etc.) — gradiente
 * de marca + logo real (se cadastrada) ou as iniciais do nome como marca
 * d'água, nunca um rótulo técnico. O nome e a categoria do local já
 * aparecem como texto normal em todo lugar que usa este componente, então
 * o fallback não precisa duplicá-los — só precisa parecer um lugar de
 * verdade, não um placeholder vazio.
 *
 * "use client" só por causa do onError da imagem (precisa de estado para
 * saber quando cair no fallback); não muda nada do que os componentes
 * server que renderizam isto fazem.
 *
 * O container (via `className`) precisa definir altura/aspect-ratio e
 * `relative` já vem embutido — só falta o chamador passar `h-36`,
 * `aspect-video` etc.
 */

interface VenueCoverImageProps {
  venue: Pick<Venue, "coverImageUrl" | "gradient" | "name" | "logoUrl">;
  className?: string;
  /** Obrigatório para o Next.js otimizar corretamente o tamanho servido da imagem. */
  sizes: string;
  priority?: boolean;
}

function initials(name: string): string {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

export function VenueCoverImage({
  venue,
  className = "",
  sizes,
  priority = false,
}: VenueCoverImageProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  if (venue.coverImageUrl && !coverFailed) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={venue.coverImageUrl}
          alt={`Foto de capa de ${venue.name}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setCoverFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${venue.gradient} ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute -left-6 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-10 -right-4 h-32 w-32 rounded-full bg-black/30 blur-2xl"
      />

      {venue.logoUrl && !logoFailed ? (
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center p-6">
          <Image
            src={venue.logoUrl}
            alt=""
            width={72}
            height={72}
            className="max-h-16 max-w-16 object-contain opacity-90"
            onError={() => setLogoFailed(true)}
          />
        </div>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-white/20 sm:text-4xl">
            {initials(venue.name)}
          </span>
        </div>
      )}
    </div>
  );
}
