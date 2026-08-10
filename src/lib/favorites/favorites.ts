import { createClient } from "@/lib/supabase/client";

/**
 * Leitura/escrita client-side na tabela `favorites`. Usado pelo
 * FavoriteButton (que roda no navegador) — não importa nada server-only,
 * ao contrário de `venue-repository.ts`.
 */

/** Verifica se o usuário logado já favoritou este estabelecimento. */
export async function isFavorited(userId: string, venueId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("venue_id", venueId)
    .maybeSingle();

  if (error) {
    console.error("FAVORITES ERROR:", error);
    return false;
  }

  return Boolean(data);
}

/** Adiciona um favorito. Retorna `false` se a chamada falhar (ex.: RLS, rede). */
export async function addFavorite(userId: string, venueId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("favorites").insert({ user_id: userId, venue_id: venueId });

  if (error) {
    console.error("FAVORITES ERROR:", error);
    return false;
  }

  return true;
}

/** Remove um favorito. Retorna `false` se a chamada falhar. */
export async function removeFavorite(userId: string, venueId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("venue_id", venueId);

  if (error) {
    console.error("FAVORITES ERROR:", error);
    return false;
  }

  return true;
}
