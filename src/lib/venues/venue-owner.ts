"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Colunas de public.venues expostas ao dono/gestor autenticado no painel.
 * Confirmadas ao vivo via PostgREST (incluindo whatsapp, whatsapp_url e
 * website, que existem na tabela real mas não são usadas no lado público).
 */
export const OWNER_VENUE_COLUMNS = [
  "id", "slug", "name", "category", "description",
  "city", "neighborhood", "address",
  "cuisine_types", "tags", "music_styles", "atmospheres", "intentions", "companions",
  "menu_highlights", "schedule",
  "price_range", "average_price_per_person", "average_price_for_couple",
  "whatsapp_number", "whatsapp", "whatsapp_url", "instagram_url", "website",
  "menu_url", "reservation_url",
  "cover_image_url", "logo_url", "video_url",
  "is_published", "is_featured", "data_confidence",
].join(",");

/** Representação manual da linha de `public.venues` vista pelo dono/gestor. */
export interface VenueOwnerRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  city: string;
  neighborhood: string;
  address: string;
  cuisine_types: string[] | null;
  tags: string[] | null;
  music_styles: string[] | null;
  atmospheres: string[] | null;
  intentions: string[] | null;
  companions: string[] | null;
  menu_highlights: string[] | null;
  schedule: string[] | null;
  price_range: string | null;
  average_price_per_person: number | null;
  average_price_for_couple: number | null;
  whatsapp_number: string | null;
  whatsapp: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  website: string | null;
  menu_url: string | null;
  reservation_url: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  video_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  data_confidence: number;
}

/**
 * Campos que o formulário de edição pode enviar em um UPDATE. Usada como
 * lista branca — nunca inclui is_published, is_featured ou data_confidence,
 * mesmo que o objeto de estado do formulário tenha outras chaves por engano.
 */
export const EDITABLE_VENUE_FIELDS = [
  "name", "category", "description", "city", "neighborhood", "address",
  "cuisine_types", "tags", "music_styles", "atmospheres", "intentions", "companions",
  "menu_highlights", "schedule",
  "price_range", "average_price_per_person", "average_price_for_couple",
  "whatsapp_number", "whatsapp", "whatsapp_url", "instagram_url", "website",
  "menu_url", "reservation_url",
] as const;

export type EditableVenueField = (typeof EDITABLE_VENUE_FIELDS)[number];

type AccessState = "checking" | "unauthorized" | "ready";

interface VenueAccessRow {
  member_role: string;
  venues: VenueOwnerRow | null;
}

interface VenueAccess {
  state: AccessState;
  venue: VenueOwnerRow | null;
  role: string | null;
  /** Permite a uma tela recarregar o venue após salvar alterações. */
  reload: () => void;
}

/**
 * Confirma, no próprio Supabase (nunca só no cliente), que o usuário
 * autenticado tem um vínculo ativo (owner ou manager) com o venueId
 * informado antes de liberar qualquer tela de edição/mídia/prévia. Um
 * venueId arbitrário ou de outro usuário sempre cai em "unauthorized",
 * porque a consulta usa o próprio user_id da sessão, não um valor vindo
 * da URL.
 */
export function useVenueAccess(venueId: string): VenueAccess {
  const router = useRouter();
  const [state, setState] = useState<AccessState>("checking");
  const [venue, setVenue] = useState<VenueOwnerRow | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("checking");
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/empresa/entrar");
        return;
      }

      const { data: membership } = await supabase
        .from("venue_members")
        .select(`member_role, venues (${OWNER_VENUE_COLUMNS})`)
        .eq("venue_id", venueId)
        .eq("user_id", userData.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      const row = membership as unknown as VenueAccessRow | null;
      if (!row || !row.venues) {
        setState("unauthorized");
        return;
      }

      setVenue(row.venues);
      setRole(row.member_role);
      setState("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [venueId, router, reloadToken]);

  return { state, venue, role, reload: () => setReloadToken((token) => token + 1) };
}
