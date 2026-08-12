"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/auth-context";
import { addFavorite, isFavorited as checkIsFavorited, removeFavorite } from "@/lib/favorites/favorites";
import { trackInteraction } from "@/lib/analytics/track-interaction";
import { updatePreferences } from "@/lib/user-intelligence/update-preferences";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.5s-7.5-4.6-10-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 10 5.5c-2.5 4.4-10 9-10 9Z"
      />
    </svg>
  );
}

interface FavoriteButtonProps {
  venueId: string;
  /**
   * "sm" (36px, padrão) é o tamanho já usado nos cards de resultado — mantido
   * como default para não alterar nada onde o componente já está em uso.
   * "lg" (44px) existe para telas de detalhe, onde o botão é um alvo de toque
   * isolado e precisa da área mínima recomendada.
   */
  size?: "sm" | "lg";
}

/**
 * Botão de favorito autocontido: cada instância verifica e alterna seu
 * próprio estado direto no Supabase, sem precisar que o card pai (ou o
 * fluxo/rota que o renderiza) busque ou passe esse dado adiante.
 */
export function FavoriteButton({ venueId, size = "sm" }: FavoriteButtonProps) {
  const user = useUser();
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    if (!user) {
      Promise.resolve().then(() => {
        if (active) setFavorited(false);
      });
      return () => {
        active = false;
      };
    }

    checkIsFavorited(user.id, venueId).then((result) => {
      if (active) setFavorited(result);
    });

    return () => {
      active = false;
    };
  }, [user, venueId]);

  async function handleClick() {
    if (!user) {
      router.push("/entrar");
      return;
    }
    if (pending) return;

    setPending(true);
    const nextFavorited = !favorited;
    const success = nextFavorited
      ? await addFavorite(user.id, venueId)
      : await removeFavorite(user.id, venueId);

    if (success) {
      setFavorited(nextFavorited);
      const interactionType = nextFavorited ? "favorite_added" : "favorite_removed";
      void trackInteraction({ userId: user.id, venueId, type: interactionType });
      void updatePreferences({ userId: user.id, venueId, interactionType });
    }
    setPending(false);
  }

  const sizeClasses = size === "lg" ? "h-11 w-11" : "h-9 w-9";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={favorited}
      title={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`inline-flex ${sizeClasses} items-center justify-center rounded-full border backdrop-blur transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        favorited
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border/60 bg-background/70 text-foreground hover:border-accent/60 hover:text-accent"
      } ${focusRing}`}
    >
      <HeartIcon filled={favorited} />
    </button>
  );
}
