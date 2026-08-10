import { createClient } from "@/lib/supabase/client";

export interface VenueDashboardStats {
  views: number;
  uniqueVisitors: number;
  likes: number;
  dislikes: number;
  favorites: number;
  whatsappClicks: number;
  routeClicks: number;
}

interface VenueDashboardStatsRow {
  views: number | null;
  unique_visitors: number | null;
  likes: number | null;
  dislikes: number | null;
  favorites: number | null;
  whatsapp_clicks: number | null;
  route_clicks: number | null;
}

/**
 * Métricas agregadas de um venue desde `since`, via a função SECURITY
 * DEFINER get_venue_dashboard_stats (024_extend_venue_dashboard_stats.sql) —
 * nunca retorna linhas individuais, só os 7 números. `null` em qualquer
 * falha (sem acesso ao venue, RLS/RPC indisponível, rede) — quem chama trata
 * isso como "não foi possível carregar", sem quebrar a tela.
 */
export async function getVenueDashboardStats(
  venueId: string,
  since: Date,
): Promise<VenueDashboardStats | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc("get_venue_dashboard_stats", {
        p_venue_id: venueId,
        p_since: since.toISOString(),
      })
      .single<VenueDashboardStatsRow>();

    if (error || !data) {
      console.error("VENUE DASHBOARD STATS ERROR:", error);
      return null;
    }

    return {
      views: Number(data.views ?? 0),
      uniqueVisitors: Number(data.unique_visitors ?? 0),
      likes: Number(data.likes ?? 0),
      dislikes: Number(data.dislikes ?? 0),
      favorites: Number(data.favorites ?? 0),
      whatsappClicks: Number(data.whatsapp_clicks ?? 0),
      routeClicks: Number(data.route_clicks ?? 0),
    };
  } catch (error) {
    console.error("VENUE DASHBOARD STATS ERROR:", error);
    return null;
  }
}
