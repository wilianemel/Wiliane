import { createClient } from "@/lib/supabase/client";
import type { TrackedInteractionType } from "@/lib/analytics/track-interaction";

interface UpdatePreferencesParams {
  userId: string;
  venueId: string;
  interactionType: TrackedInteractionType;
}

/** União sem duplicar — só acrescenta valores que ainda não estão no array. */
function mergeUnique(existing: string[] | null | undefined, additions: string[]): string[] {
  const merged = new Set(existing ?? []);
  for (const value of additions) {
    if (value) merged.add(value);
  }
  return Array.from(merged);
}

/**
 * Alimenta `public.user_preferences` a partir de eventos já registrados em
 * `public.user_interactions` — só reage a "favorite_added" nesta primeira
 * camada; os demais tipos são no-op por enquanto (best-effort, nunca lança).
 */
export async function updatePreferences({
  userId,
  venueId,
  interactionType,
}: UpdatePreferencesParams): Promise<void> {
  if (interactionType !== "favorite_added") return;

  try {
    const supabase = createClient();

    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("category, atmospheres, companions, music_styles")
      .eq("id", venueId)
      .maybeSingle();

    if (venueError || !venue) {
      console.error("UPDATE PREFERENCES ERROR:", venueError);
      return;
    }

    const { data: preferences, error: preferencesError } = await supabase
      .from("user_preferences")
      .select("favorite_categories, favorite_atmospheres, preferred_companions, preferred_music_styles")
      .eq("user_id", userId)
      .maybeSingle();

    if (preferencesError) {
      console.error("UPDATE PREFERENCES ERROR:", preferencesError);
      return;
    }

    const favoriteCategories = mergeUnique(
      preferences?.favorite_categories,
      venue.category ? [venue.category as string] : [],
    );
    const favoriteAtmospheres = mergeUnique(
      preferences?.favorite_atmospheres,
      (venue.atmospheres as string[] | null) ?? [],
    );
    const preferredCompanions = mergeUnique(
      preferences?.preferred_companions,
      (venue.companions as string[] | null) ?? [],
    );
    const preferredMusicStyles = mergeUnique(
      preferences?.preferred_music_styles,
      (venue.music_styles as string[] | null) ?? [],
    );

    const { error: upsertError } = await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        favorite_categories: favoriteCategories,
        favorite_atmospheres: favoriteAtmospheres,
        preferred_companions: preferredCompanions,
        preferred_music_styles: preferredMusicStyles,
      },
      { onConflict: "user_id" },
    );

    if (upsertError) {
      console.error("UPDATE PREFERENCES ERROR:", upsertError);
    }
  } catch (error) {
    console.error("UPDATE PREFERENCES ERROR:", error);
  }
}
