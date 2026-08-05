"use client";

import Link from "next/link";
import { useVenueAccess, type VenueOwnerRow } from "@/lib/venues/venue-owner";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface VenueAccessGateProps {
  venueId: string;
  children: (venue: VenueOwnerRow, role: string, reload: () => void) => React.ReactNode;
}

/**
 * Bloqueia o conteúdo até confirmar, via venue_members, que o usuário
 * autenticado tem vínculo ativo com este venueId. Um venueId de outro
 * estabelecimento (ou inexistente) sempre cai no estado "unauthorized" —
 * nunca renderiza dados de um venue que o usuário não possui.
 */
export function VenueAccessGate({ venueId, children }: VenueAccessGateProps) {
  const { state, venue, role, reload } = useVenueAccess(venueId);

  if (state === "checking") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <div
          aria-hidden="true"
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
        />
      </div>
    );
  }

  if (state === "unauthorized" || !venue || !role) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Acesso não autorizado</h1>
        <p className="mt-3 text-sm text-muted">
          Você não tem vínculo ativo com este estabelecimento, ou ele não existe.
        </p>
        <Link
          href="/empresa/painel"
          className={`mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Voltar para o painel
        </Link>
      </div>
    );
  }

  return <>{children(venue, role, reload)}</>;
}
