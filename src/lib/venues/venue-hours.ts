"use client";

import { createClient } from "@/lib/supabase/client";

/** 0 = domingo, 1 = segunda, ..., 6 = sábado — mesma convenção da coluna day_of_week (029_create_venue_business_hours.sql). */
export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export interface VenueBusinessHour {
  day_of_week: DayOfWeek;
  /** "HH:MM" ou "HH:MM:SS" — null quando is_closed=true ou ainda não preenchido. */
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

/** Os 7 dias, todos fechados — estado inicial de um venue sem horário cadastrado ainda. */
export function createDefaultVenueBusinessHours(): VenueBusinessHour[] {
  return DAYS_OF_WEEK.map((day) => ({
    day_of_week: day,
    opens_at: null,
    closes_at: null,
    is_closed: true,
  }));
}

interface VenueBusinessHourRow {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

/**
 * Sempre retorna as 7 linhas (domingo a sábado), preenchendo com o padrão
 * "fechado" qualquer dia que ainda não tenha registro na tabela — o
 * chamador nunca precisa checar quais dias existem, só qual está fechado.
 * `null` só em caso de falha real (rede, RLS) — quem chama trata como
 * "não foi possível carregar", sem quebrar a tela (mesmo padrão de
 * venue-dashboard.ts).
 */
export async function getVenueBusinessHours(venueId: string): Promise<VenueBusinessHour[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("venue_business_hours")
    .select("day_of_week, opens_at, closes_at, is_closed")
    .eq("venue_id", venueId);

  if (error) return null;

  const byDay = new Map(
    ((data ?? []) as VenueBusinessHourRow[]).map((row) => [row.day_of_week as DayOfWeek, row]),
  );
  const fallback = createDefaultVenueBusinessHours();

  return DAYS_OF_WEEK.map((day): VenueBusinessHour => {
    const row = byDay.get(day);
    return row
      ? { day_of_week: day, opens_at: row.opens_at, closes_at: row.closes_at, is_closed: row.is_closed }
      : fallback[day];
  });
}

/**
 * Sempre grava as 7 linhas de uma vez (upsert por venue_id+day_of_week,
 * mesma constraint unique da tabela) — nunca envia só os dias alterados,
 * pra não deixar um dia antigo "preso" num valor anterior por engano.
 */
export async function saveVenueBusinessHours(
  venueId: string,
  hours: VenueBusinessHour[],
): Promise<{ error: string } | null> {
  const supabase = createClient();

  const fallback = createDefaultVenueBusinessHours();
  const rows = DAYS_OF_WEEK.map((day) => {
    const hour = hours.find((item) => item.day_of_week === day) ?? fallback[day];
    return {
      venue_id: venueId,
      day_of_week: day,
      is_closed: hour.is_closed,
      opens_at: hour.is_closed ? null : hour.opens_at,
      closes_at: hour.is_closed ? null : hour.closes_at,
    };
  });

  const { error } = await supabase
    .from("venue_business_hours")
    .upsert(rows, { onConflict: "venue_id,day_of_week" });

  if (error) {
    return { error: "Não foi possível salvar o horário agora. Tente novamente em instantes." };
  }

  return null;
}
