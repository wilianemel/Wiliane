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

export interface VenueDiagnosticStats {
  views: number;
  uniqueVisitors: number;
  favorites: number;
  whatsappClicks: number;
  websiteClicks: number;
  reservationClicks: number;
  routeClicks: number;
  recommendationCount: number;
  likes: number;
  dislikes: number;
}

interface VenueDiagnosticStatsRow {
  views: number | null;
  unique_visitors: number | null;
  favorites: number | null;
  whatsapp_clicks: number | null;
  website_clicks: number | null;
  reservation_clicks: number | null;
  route_clicks: number | null;
  recommendation_count: number | null;
  likes: number | null;
  dislikes: number | null;
}

/**
 * Superset de métricas para o "Diagnóstico do estabelecimento" (plano
 * Master), via get_venue_diagnostic_stats (venue_master_plan_and_diagnostics)
 * — função separada de get_venue_dashboard_stats, mesma autorização, mais
 * colunas. `null` em qualquer falha, mesmo padrão de getVenueDashboardStats.
 */
export async function getVenueDiagnosticStats(
  venueId: string,
  since: Date,
): Promise<VenueDiagnosticStats | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc("get_venue_diagnostic_stats", {
        p_venue_id: venueId,
        p_since: since.toISOString(),
      })
      .single<VenueDiagnosticStatsRow>();

    if (error || !data) {
      console.error("VENUE DIAGNOSTIC STATS ERROR:", error);
      return null;
    }

    return {
      views: Number(data.views ?? 0),
      uniqueVisitors: Number(data.unique_visitors ?? 0),
      favorites: Number(data.favorites ?? 0),
      whatsappClicks: Number(data.whatsapp_clicks ?? 0),
      websiteClicks: Number(data.website_clicks ?? 0),
      reservationClicks: Number(data.reservation_clicks ?? 0),
      routeClicks: Number(data.route_clicks ?? 0),
      recommendationCount: Number(data.recommendation_count ?? 0),
      likes: Number(data.likes ?? 0),
      dislikes: Number(data.dislikes ?? 0),
    };
  } catch (error) {
    console.error("VENUE DIAGNOSTIC STATS ERROR:", error);
    return null;
  }
}
