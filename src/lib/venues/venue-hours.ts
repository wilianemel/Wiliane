/**
 * Sem "use client" de propósito: `getVenueBusinessHours`/`saveVenueBusinessHours`
 * usam o client de browser (chamado só a partir de componentes client, como
 * venue-hours-editor.tsx — nada muda para eles), mas as funções puras de
 * status (isVenueOpenNow, getVenueHoursStatus, getNextOpeningTime) e os
 * tipos/constantes precisam poder ser importados também por código
 * server-only (venue-repository.ts, para o perfil público). Mesmo padrão já
 * usado em venue-dashboard.ts, que também chama o client de browser sem
 * marcar o arquivo inteiro como "use client".
 */
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

export interface VenueBusinessHourRow {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

/**
 * Preenche com o padrão "fechado" qualquer dia que não esteja em `rows` —
 * quem chama nunca precisa checar quais dias existem, só qual está
 * fechado. Extraída para ser reaproveitada tanto por `getVenueBusinessHours`
 * (client, painel do dono) quanto pela busca equivalente server-only usada
 * no perfil público (venue-repository.ts), sem duplicar essa lógica.
 */
export function normalizeVenueBusinessHourRows(rows: VenueBusinessHourRow[]): VenueBusinessHour[] {
  const byDay = new Map(rows.map((row) => [row.day_of_week as DayOfWeek, row]));
  const fallback = createDefaultVenueBusinessHours();

  return DAYS_OF_WEEK.map((day): VenueBusinessHour => {
    const row = byDay.get(day);
    return row
      ? { day_of_week: day, opens_at: row.opens_at, closes_at: row.closes_at, is_closed: row.is_closed }
      : fallback[day];
  });
}

/**
 * Sempre retorna as 7 linhas (domingo a sábado) — ver normalizeVenueBusinessHourRows.
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

  return normalizeVenueBusinessHourRows((data ?? []) as VenueBusinessHourRow[]);
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

// ============================================================================
// Status de funcionamento (aberto agora / fecha às / abre em) — funções
// puras, sem I/O. Nunca chamam Date.now()/new Date() implicitamente durante
// render: `now` é sempre recebido de quem chama (o valor default só existe
// para uso fora de React, ex.: scripts/testes). Em um componente, calcule
// `now` uma vez (useState/useEffect ou no servidor) e passe explicitamente.
// ============================================================================

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export interface VenueHoursStatus {
  isOpen: boolean;
  label: string;
  closesAt?: string;
  opensAt?: string;
  nextOpeningLabel?: string;
}

interface NextOpening {
  dayOffset: number;
  day_of_week: DayOfWeek;
  opens_at: string;
}

/** Dia da semana (0-6) e minutos desde 00:00, ambos já em America/Sao_Paulo — independe do timezone do servidor/navegador que roda o código. */
function getSaoPauloParts(now: Date): { dayOfWeek: DayOfWeek; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  let hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  // Alguns runtimes ICU antigos retornam "24" para meia-noite com hourCycle h23.
  if (hour === 24) hour = 0;

  const WEEKDAY_TO_DAY_OF_WEEK: Record<string, DayOfWeek> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return { dayOfWeek: WEEKDAY_TO_DAY_OF_WEEK[weekday] ?? 0, minutes: hour * 60 + minute };
}

/** "HH:MM" ou "HH:MM:SS" -> minutos desde 00:00. `null` para qualquer formato inválido/vazio, nunca lança erro. */
function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function formatMinutesAsLabel(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function findHourForDay(hours: VenueBusinessHour[], day: DayOfWeek): VenueBusinessHour | undefined {
  return hours.find((hour) => hour.day_of_week === day);
}

interface ValidWindow {
  opensMinutes: number;
  closesMinutes: number;
  /** true quando closesMinutes <= opensMinutes — a janela atravessa a meia-noite (ex.: 18:00 -> 02:00). */
  crossesMidnight: boolean;
}

/**
 * Normaliza um dia em uma janela válida de horário, ou `null` quando o dia
 * está fechado (is_closed=true) ou tem horário ausente/inválido — nunca
 * lança erro, um dia "aberto" mas sem hora preenchida é tratado como sem
 * janela (equivalente a fechado para efeito de cálculo).
 */
function getValidWindow(hour: VenueBusinessHour | undefined): ValidWindow | null {
  if (!hour || hour.is_closed) return null;

  const opensMinutes = parseTimeToMinutes(hour.opens_at);
  const closesMinutes = parseTimeToMinutes(hour.closes_at);
  if (opensMinutes === null || closesMinutes === null) return null;
  if (opensMinutes === closesMinutes) return null;

  return { opensMinutes, closesMinutes, crossesMidnight: closesMinutes <= opensMinutes };
}

/**
 * Verifica se `now` cai dentro da janela de hoje, ou dentro da cauda de
 * ontem quando a janela de ontem atravessa a meia-noite (ex.: sexta
 * 18:00->02:00 continua aberta às 01:00 de sábado). Não precisa olhar mais
 * de um dia para trás: nenhuma janela cadastrada pode passar de 24h.
 */
function computeActiveWindow(
  hours: VenueBusinessHour[],
  today: DayOfWeek,
  nowMinutes: number,
): { isOpen: boolean; closesMinutes?: number } {
  const todayWindow = getValidWindow(findHourForDay(hours, today));
  if (todayWindow) {
    const isOpenToday = todayWindow.crossesMidnight
      ? nowMinutes >= todayWindow.opensMinutes
      : nowMinutes >= todayWindow.opensMinutes && nowMinutes < todayWindow.closesMinutes;
    if (isOpenToday) return { isOpen: true, closesMinutes: todayWindow.closesMinutes };
  }

  const yesterday = ((today + 6) % 7) as DayOfWeek;
  const yesterdayWindow = getValidWindow(findHourForDay(hours, yesterday));
  if (yesterdayWindow?.crossesMidnight && nowMinutes < yesterdayWindow.closesMinutes) {
    return { isOpen: true, closesMinutes: yesterdayWindow.closesMinutes };
  }

  return { isOpen: false };
}

/** Retorna só o booleano — para filtros/eligibilidade que não precisam do texto do status. */
export function isVenueOpenNow(hours: VenueBusinessHour[], now: Date = new Date()): boolean {
  if (!hours || hours.length === 0) return false;

  const { dayOfWeek, minutes } = getSaoPauloParts(now);
  return computeActiveWindow(hours, dayOfWeek, minutes).isOpen;
}

/**
 * Primeiro horário de abertura estritamente depois de `now`, olhando hoje
 * (só se ainda não abriu) e os próximos 6 dias. `null` quando nenhum dia
 * tem horário válido nos próximos 7 dias (ex.: os 7 dias fechados/vazios).
 */
export function getNextOpeningTime(
  hours: VenueBusinessHour[],
  now: Date = new Date(),
): NextOpening | null {
  if (!hours || hours.length === 0) return null;

  const { dayOfWeek: today, minutes: nowMinutes } = getSaoPauloParts(now);

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const day = ((today + dayOffset) % 7) as DayOfWeek;
    const window = getValidWindow(findHourForDay(hours, day));
    if (!window) continue;

    if (dayOffset === 0 && window.opensMinutes <= nowMinutes) continue;

    return { dayOffset, day_of_week: day, opens_at: formatMinutesAsLabel(window.opensMinutes) };
  }

  return null;
}

/**
 * Junta isVenueOpenNow + getNextOpeningTime num único objeto pronto para
 * exibição. `hours` vazio é um estado normal (venue sem horário cadastrado
 * ainda) — não usa venues.open_now como fallback, só retorna "fechado" sem
 * dado de horário algum.
 */
export function getVenueHoursStatus(
  hours: VenueBusinessHour[],
  now: Date = new Date(),
): VenueHoursStatus {
  if (!hours || hours.length === 0) {
    return { isOpen: false, label: "Horário não informado" };
  }

  const { dayOfWeek: today, minutes: nowMinutes } = getSaoPauloParts(now);
  const active = computeActiveWindow(hours, today, nowMinutes);

  if (active.isOpen && active.closesMinutes !== undefined) {
    const closesAt = formatMinutesAsLabel(active.closesMinutes);
    return { isOpen: true, label: `Fecha às ${closesAt}`, closesAt };
  }
  if (active.isOpen) {
    // Não deveria acontecer (toda janela aberta tem closesMinutes), mas sem isso o TS não estreita — fallback nunca deveria ser exercitado na prática.
    return { isOpen: true, label: "Aberto agora" };
  }

  const next = getNextOpeningTime(hours, now);
  if (!next) {
    return { isOpen: false, label: "Fechado agora" };
  }

  if (next.dayOffset === 0) {
    return {
      isOpen: false,
      label: `Abre hoje às ${next.opens_at}`,
      opensAt: next.opens_at,
      nextOpeningLabel: `Abre hoje às ${next.opens_at}`,
    };
  }
  if (next.dayOffset === 1) {
    return {
      isOpen: false,
      label: `Abre amanhã às ${next.opens_at}`,
      opensAt: next.opens_at,
      nextOpeningLabel: `Abre amanhã às ${next.opens_at}`,
    };
  }

  const dayLabel = DAY_LABELS[next.day_of_week];
  return {
    isOpen: false,
    label: `Abre ${dayLabel} às ${next.opens_at}`,
    opensAt: next.opens_at,
    nextOpeningLabel: `Abre ${dayLabel} às ${next.opens_at}`,
  };
}

/**
 * Roda getVenueHoursStatus para vários venues de uma vez, com o mesmo `now`
 * para todos — usada nas páginas que renderizam listas de cards (Home,
 * /buscar, /descobrir), depois de um único fetch em lote de
 * venue_business_hours (getVenuesBusinessHours em venue-repository.ts).
 * Só inclui no resultado os venues presentes em `hoursByVenueId` — quem não
 * tem horário estruturado simplesmente não aparece aqui, e cada card cai no
 * próprio fallback baseado em venue.openNow.
 */
export function buildVenueHoursStatusMap(
  hoursByVenueId: Record<string, VenueBusinessHour[]>,
  now: Date = new Date(),
): Record<string, VenueHoursStatus> {
  const result: Record<string, VenueHoursStatus> = {};
  for (const [venueId, hours] of Object.entries(hoursByVenueId)) {
    result[venueId] = getVenueHoursStatus(hours, now);
  }
  return result;
}
