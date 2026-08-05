import Image from "next/image";
import type { Venue } from "@/data/venues";

/**
 * Imagem de capa de um estabelecimento, com fallback elegante quando não há
 * `coverImageUrl` real cadastrada — reaproveita o mesmo padrão visual
 * (gradiente + rótulo "Área reservada para imagem") já usado em todo o
 * projeto antes de existir mídia real, em vez de inventar uma imagem.
 *
 * O container (via `className`) precisa definir altura/aspect-ratio e
 * `relative` já vem embutido — só falta o chamador passar `h-36`,
 * `aspect-video` etc.
 */

interface VenueCoverImageProps {
  venue: Pick<Venue, "coverImageUrl" | "gradient" | "name">;
  className?: string;
  /** Obrigatório para o Next.js otimizar corretamente o tamanho servido da imagem. */
  sizes: string;
  priority?: boolean;
}

export function VenueCoverImage({
  venue,
  className = "",
  sizes,
  priority = false,
}: VenueCoverImageProps) {
  if (venue.coverImageUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={venue.coverImageUrl}
          alt={`Foto de capa de ${venue.name}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
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
      <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur">
        Área reservada para imagem
      </span>
    </div>
  );
}
