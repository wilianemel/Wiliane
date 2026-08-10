"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { trackInteraction } from "@/lib/analytics/track-interaction";

/**
 * Dispara "venue_view" quando a página de um estabelecimento carrega — para
 * usuários logados e para visitantes anônimos (trackInteraction decide
 * sozinho qual identificador usar). Não renderiza nada.
 *
 * Espera a sessão resolver (`loading`) antes de disparar: sem isso, um
 * visitante logado geraria dois eventos na mesma abertura — um anônimo
 * (enquanto `user` ainda é `null`, antes da sessão carregar) e outro
 * autenticado (depois que `user` resolve) — quebrando a regra de "1
 * abertura = 1 evento".
 */
export function VenueViewTracker({ venueId }: { venueId: string }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !venueId) return;
    void trackInteraction({ userId: user?.id, venueId, type: "venue_view" });
  }, [loading, user, venueId]);

  return null;
}
