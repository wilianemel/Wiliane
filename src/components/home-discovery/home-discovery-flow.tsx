"use client";

import { useMemo, useState } from "react";
import { QuestionCard } from "@/components/discovery/question-card";
import { HOME_QUESTIONS, INTENTION_OPTIONS, SENSATION_OPTIONS } from "@/lib/home-discovery/config";
import { COMPANION_OPTIONS } from "@/lib/discovery/companion-options";
import { getRecommendationCards } from "@/lib/home-discovery/get-recommendations";
import type { RecommendationCard } from "@/lib/home-discovery/types";
import { useCity } from "@/lib/city-context";
import { RecommendationResults } from "./recommendation-results";

type Phase = "form" | "loading" | "results" | "empty" | "error";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent"
      />
      <p className="text-base font-medium text-foreground sm:text-lg">
        Estou encontrando experiências que combinam com seu momento...
      </p>
    </div>
  );
}

interface EmptyOrErrorStateProps {
  message: string;
  onAdjust: () => void;
}

function EmptyOrErrorState({ message, onAdjust }: EmptyOrErrorStateProps) {
  return (
    <div className="rounded-2xl border border-border bg-background-elevated p-8 text-center">
      <p className="text-base font-medium text-foreground sm:text-lg">{message}</p>
      <button
        type="button"
        onClick={onAdjust}
        className={`mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
      >
        Ajustar escolhas
      </button>
    </div>
  );
}

export function HomeDiscoveryFlow() {
  // Sorteada uma vez por montagem (estável entre re-renders). Servidor e
  // cliente sorteiam valores diferentes por design — o <h1> que exibe isso
  // usa suppressHydrationWarning, o mecanismo do próprio React para
  // conteúdo que é legitimamente diferente em cada ambiente.
  const [question] = useState(
    () => HOME_QUESTIONS[Math.floor(Math.random() * HOME_QUESTIONS.length)],
  );

  const [sensation, setSensation] = useState<string | null>(null);
  const [companion, setCompanion] = useState<string | null>(null);
  const [intention, setIntention] = useState<string | null>(null);
  // Compartilhado com o Header via CityProvider (ver src/lib/city-context.tsx),
  // para o pin de cidade refletir o que foi pesquisado aqui em vez de um
  // texto fixo.
  const { city, setCity } = useCity();

  const [phase, setPhase] = useState<Phase>("form");
  const [results, setResults] = useState<RecommendationCard[]>([]);

  const canSubmit = useMemo(
    () => Boolean(sensation && companion && intention && city.trim().length > 0),
    [sensation, companion, intention, city],
  );

  async function handleSubmit() {
    if (!canSubmit || !sensation || !companion || !intention) return;

    setPhase("loading");

    try {
      const cards = await getRecommendationCards({
        city: city.trim(),
        atmosphere: sensation,
        companion,
        intention,
      });

      const sorted = [...cards].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

      if (sorted.length === 0) {
        setResults([]);
        setPhase("empty");
        return;
      }

      setResults(sorted);
      setPhase("results");
    } catch {
      // Nunca expor o erro técnico do Supabase — só um estado amigável.
      setPhase("error");
    }
  }

  function backToForm() {
    setPhase("form");
  }

  return (
    <section
      id="qual-e-a-boa-agora"
      className="relative overflow-hidden border-b border-border/60"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      />

      <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        {phase === "loading" && <LoadingState />}

        {phase === "empty" && (
          <EmptyOrErrorState
            message="Não encontrei uma combinação perfeita agora. Tente mudar uma das escolhas."
            onAdjust={backToForm}
          />
        )}

        {phase === "error" && (
          <EmptyOrErrorState
            message="Não conseguimos buscar recomendações agora. Tente novamente em instantes."
            onAdjust={backToForm}
          />
        )}

        {phase === "results" && (
          <RecommendationResults results={results} onRestart={backToForm} />
        )}

        {phase === "form" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent sm:text-sm">
              Menos tempo procurando. Mais tempo vivendo.
            </p>
            <h1
              suppressHydrationWarning
              className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl"
            >
              {question}
            </h1>

            <div className="mt-8">
              <QuestionCard
                name="sensation"
                question="Escolha o que combina com seu momento"
                options={SENSATION_OPTIONS}
                value={sensation}
                onChange={setSensation}
              />
            </div>

            <div className="mt-10">
              <QuestionCard
                name="companion"
                question="Com quem você vai?"
                options={COMPANION_OPTIONS}
                value={companion}
                onChange={setCompanion}
              />
            </div>

            <div className="mt-10">
              <QuestionCard
                name="intention"
                question="O que você quer viver?"
                options={INTENTION_OPTIONS}
                value={intention}
                onChange={setIntention}
              />
            </div>

            <div className="mt-10">
              <label
                htmlFor="home-discovery-city"
                className="text-lg font-semibold text-foreground sm:text-xl"
              >
                Em qual cidade?
              </label>
              <p className="mt-1 text-sm text-muted">
                Deixe como está para buscar em São José dos Campos, ou digite outra cidade.
              </p>
              <input
                id="home-discovery-city"
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Digite a cidade"
                className={`mt-4 w-full max-w-sm rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none ${focusRing}`}
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`mt-10 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
            >
              Encontrar minha boa
            </button>
          </>
        )}
      </div>
    </section>
  );
}
