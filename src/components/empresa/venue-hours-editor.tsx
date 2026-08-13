"use client";

import { useEffect, useState } from "react";
import {
  DAYS_OF_WEEK,
  DAY_LABELS,
  createDefaultVenueBusinessHours,
  getVenueBusinessHours,
  saveVenueBusinessHours,
  type DayOfWeek,
  type VenueBusinessHour,
} from "@/lib/venues/venue-hours";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const timeInputClasses = `rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none ${focusRing}`;

type LoadStatus = "loading" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface VenueHoursEditorProps {
  venueId: string;
}

/** "18:00:00" (retornado pelo Postgres) -> "18:00" (formato aceito por <input type="time">). */
function toTimeInputValue(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

/**
 * Editor estruturado de horário de funcionamento — lê e grava só em
 * public.venue_business_hours (029_create_venue_business_hours.sql), tabela
 * própria e independente de public.venues. Não toca em venues.schedule nem
 * venues.open_now; o "Salvar horário" desta seção só afeta os 7 dias.
 */
export function VenueHoursEditor({ venueId }: VenueHoursEditorProps) {
  const [hours, setHours] = useState<VenueBusinessHour[]>(createDefaultVenueBusinessHours);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVenueBusinessHours(venueId).then((result) => {
      if (cancelled) return;
      if (result) {
        setHours(result);
        setLoadStatus("ready");
      } else {
        setLoadStatus("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  function updateDay(day: DayOfWeek, patch: Partial<VenueBusinessHour>) {
    setHours((current) =>
      current.map((hour) => (hour.day_of_week === day ? { ...hour, ...patch } : hour)),
    );
    setSaveStatus("idle");
  }

  async function handleSave() {
    const hasIncompleteDay = hours.some(
      (hour) => !hour.is_closed && (!hour.opens_at || !hour.closes_at),
    );
    if (hasIncompleteDay) {
      setErrorMessage(
        "Preencha abertura e fechamento de todos os dias abertos, ou marque o dia como fechado.",
      );
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    setErrorMessage(null);

    const result = await saveVenueBusinessHours(venueId, hours);
    if (result) {
      setErrorMessage(result.error);
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saved");
  }

  return (
    <section className="rounded-2xl border border-border bg-background-elevated p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">
        Horário de funcionamento
      </h2>
      <p className="mt-1 text-sm text-muted">
        Defina os dias e horários em que seu estabelecimento está aberto.
      </p>

      {loadStatus === "loading" && (
        <p className="mt-6 text-sm text-muted">Carregando horário...</p>
      )}

      {loadStatus === "error" && (
        <p className="mt-6 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          Não foi possível carregar o horário agora. Tente novamente em instantes.
        </p>
      )}

      {loadStatus === "ready" && (
        <div className="mt-6 flex flex-col gap-3">
          {DAYS_OF_WEEK.map((day) => {
            const hour = hours.find((item) => item.day_of_week === day);
            if (!hour) return null;

            return (
              <div
                key={day}
                className="flex flex-col gap-3 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="text-sm font-medium text-foreground sm:w-24 sm:shrink-0">
                  {DAY_LABELS[day]}
                </span>

                <label className="flex items-center gap-2 text-sm text-muted sm:w-28 sm:shrink-0">
                  <input
                    type="checkbox"
                    checked={hour.is_closed}
                    onChange={(event) => updateDay(day, { is_closed: event.target.checked })}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  Fechado
                </label>

                {!hour.is_closed && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      value={toTimeInputValue(hour.opens_at)}
                      onChange={(event) => updateDay(day, { opens_at: event.target.value })}
                      aria-label={`Horário de abertura de ${DAY_LABELS[day]}`}
                      className={timeInputClasses}
                    />
                    <span className="text-sm text-muted">até</span>
                    <input
                      type="time"
                      value={toTimeInputValue(hour.closes_at)}
                      onChange={(event) => updateDay(day, { closes_at: event.target.value })}
                      aria-label={`Horário de fechamento de ${DAY_LABELS[day]}`}
                      className={timeInputClasses}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </p>
      )}
      {saveStatus === "saved" && (
        <p className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
          Horário salvo.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={loadStatus !== "ready" || saveStatus === "saving"}
        className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
      >
        {saveStatus === "saving" ? "Salvando..." : "Salvar horário"}
      </button>
    </section>
  );
}
