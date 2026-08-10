"use client";

import { useEffect } from "react";
import { useUser } from "@/lib/auth/auth-context";
import { trackInteraction } from "@/lib/analytics/track-interaction";

/**
 * Dispara "venue_view" quando a página de um estabelecimento carrega. Não
 * renderiza nada — só existe porque `trackInteraction` precisa do usuário
 * logado (client-side, via useUser()) e a página de detalhe é um Server
 * Component. Sem sessão, não há user_id (obrigatório na tabela): o evento é
 * simplesmente ignorado, mesma regra já usada em register-interaction.ts.
 */
export function VenueViewTracker({ venueId }: { venueId: string }) {
  const user = useUser();

  useEffect(() => {
    if (!user || !venueId) return;
    void trackInteraction({ userId: user.id, venueId, type: "venue_view" });
  }, [user, venueId]);

  return null;
}
