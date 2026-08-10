import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPublishedVenues } from "@/lib/venues/venue-repository";
import { SearchResultCard } from "@/components/search/search-result-card";
import { BackButton } from "./back-button";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default async function FavoritosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Você não está logado</h1>
        <p className="mt-4 text-sm text-muted">Entre na sua conta para ver seus favoritos.</p>
        <Link
          href="/entrar"
          className={`mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  const { data: favoriteRows } = await supabase
    .from("favorites")
    .select("venue_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const favoriteVenueIds = (favoriteRows ?? []).map((row) => row.venue_id as string);
  const venues = await getPublishedVenues();
  // favorites.venue_id é o UUID real (public.venues.id) — venue.id, no
  // resto do app, é o slug. O cruzamento precisa usar venue.venueId.
  const venueByRealId = new Map(venues.map((venue) => [venue.venueId, venue]));
  const favoriteVenues = favoriteVenueIds
    .map((id) => venueByRealId.get(id))
    .filter((venue) => venue !== undefined);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-4">
        <BackButton />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Seus favoritos
      </h1>
      <p className="mt-2 text-sm text-muted">
        Os estabelecimentos que você marcou com o coração aparecem aqui.
      </p>

      {favoriteVenues.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-background-elevated p-8 text-center">
          <p className="text-lg font-semibold text-foreground">
            Você ainda não favoritou nenhum estabelecimento.
          </p>
          <p className="mt-2 text-sm text-muted">
            Toque no coração de um card em Descobrir ou Buscar para salvá-lo aqui.
          </p>
          <Link
            href="/descobrir"
            className={`mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
          >
            Descobrir experiências
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favoriteVenues.map((venue) => (
            <SearchResultCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
}
