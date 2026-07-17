"use client";

import { useEffect, useMemo, useState } from "react";
import { getRecommendations } from "@/lib/match-engine";
import type { DiscoveryAnswers, MatchResult } from "@/types/discovery";
import { ProgressBar } from "./progress-bar";
import { QuestionCard } from "./question-card";
import { Results } from "./results";
import {
  ATMOSPHERE_OPTIONS,
  BUDGET_OPTIONS,
  COMPANION_OPTIONS,
  DISTANCE_OPTIONS,
  INTENTION_OPTIONS,
  MUSIC_OPTIONS,
} from "./steps";
import { VenueProfile } from "@/components/venues/venue-profile";
import type { Venue } from "@/data/venues";

const TOTAL_STEPS = 5;
const STEP_LABELS = ["Intenção", "Companhia", "Orçamento", "Distância", "Ambiente"];
/** Duração do estado de carregamento visual antes de exibir os resultados. */
const LOADING_DURATION_MS = 700;

const INITIAL_ANSWERS: DiscoveryAnswers = {
  intention: null,
  companion: null,
  budgetMax: null,
  distanceMax: null,
  atmosphere: null,
  music: "sem-preferencia",
};

type Phase = "questions" | "loading" | "results" | "detail";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-4 w-4"
      aria-hidden="true"
    >
      {direction === "right" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M11 18l-6-6 6-6" />
      )}
    </svg>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <div
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent"
      />
      <p className="text-base font-medium text-foreground sm:text-lg">
        Calculando a compatibilidade com base nas suas respostas...
      </p>
      <p className="text-sm text-muted">
        Cálculo local e determinístico, sem inteligência artificial real.
      </p>
    </div>
  );
}

export function DiscoveryFlow({ venues }: { venues: Venue[] }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<DiscoveryAnswers>(INITIAL_ANSWERS);
  const [phase, setPhase] = useState<Phase>("questions");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<MatchResult | null>(null);

  useEffect(() => {
    if (phase !== "loading") return;

    const timer = setTimeout(() => {
      setResults(getRecommendations(answers, venues));
      setPhase("results");
    }, LOADING_DURATION_MS);

    return () => clearTimeout(timer);
  }, [phase, answers, venues]);

  const isStepValid = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return answers.intention !== null;
      case 1:
        return answers.companion !== null;
      case 2:
        return answers.budgetMax !== null;
      case 3:
        return answers.distanceMax !== null;
      case 4:
        return answers.atmosphere !== null;
      default:
        return false;
    }
  }, [stepIndex, answers]);

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (!isStepValid) return;
    if (stepIndex === TOTAL_STEPS - 1) {
      setPhase("loading");
      return;
    }
    setStepIndex((current) => Math.min(TOTAL_STEPS - 1, current + 1));
  }

  function restart() {
    setAnswers(INITIAL_ANSWERS);
    setStepIndex(0);
    setResults([]);
    setSelectedResult(null);
    setPhase("questions");
  }

  function selectResult(result: MatchResult) {
    setSelectedResult(result);
    setPhase("detail");
  }

  function backToResults() {
    setSelectedResult(null);
    setPhase("results");
  }

  if (phase === "loading") {
    return <LoadingState />;
  }

  if (phase === "detail" && selectedResult) {
    return (
      <VenueProfile
        venue={selectedResult.venue}
        match={{ score: selectedResult.score, reasons: selectedResult.reasons }}
        backLabel="Voltar para os resultados"
        onBack={backToResults}
        onRestart={restart}
      />
    );
  }

  if (phase === "results") {
    return <Results results={results} onRestart={restart} onSelect={selectResult} />;
  }

  const selectedBudgetId =
    BUDGET_OPTIONS.find((option) => option.maxPerPerson === answers.budgetMax)?.id ?? null;
  const selectedDistanceId =
    DISTANCE_OPTIONS.find((option) => option.maxKm === answers.distanceMax)?.id ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Vamos encontrar a experiência certa para hoje.
      </h1>
      <p className="mt-2 text-sm text-muted sm:text-base">
        Responda algumas perguntas. Em seguida, mostraremos apenas três opções
        compatíveis com o seu momento.
      </p>

      <div className="mt-8">
        <ProgressBar
          currentStep={stepIndex + 1}
          totalSteps={TOTAL_STEPS}
          stepLabel={STEP_LABELS[stepIndex]}
        />
      </div>

      <div className="mt-8">
        {stepIndex === 0 && (
          <QuestionCard
            name="intention"
            question="O que você quer viver hoje?"
            options={INTENTION_OPTIONS}
            value={answers.intention}
            onChange={(id) =>
              setAnswers((current) => ({
                ...current,
                intention: id as DiscoveryAnswers["intention"],
              }))
            }
          />
        )}

        {stepIndex === 1 && (
          <QuestionCard
            name="companion"
            question="Com quem você vai?"
            options={COMPANION_OPTIONS}
            value={answers.companion}
            onChange={(id) =>
              setAnswers((current) => ({
                ...current,
                companion: id as DiscoveryAnswers["companion"],
              }))
            }
          />
        )}

        {stepIndex === 2 && (
          <QuestionCard
            name="budget"
            question="Quanto pretende gastar por pessoa?"
            options={BUDGET_OPTIONS}
            value={selectedBudgetId}
            onChange={(id) => {
              const option = BUDGET_OPTIONS.find((item) => item.id === id);
              if (!option) return;
              setAnswers((current) => ({ ...current, budgetMax: option.maxPerPerson }));
            }}
          />
        )}

        {stepIndex === 3 && (
          <QuestionCard
            name="distance"
            question="Até onde você aceita ir?"
            options={DISTANCE_OPTIONS}
            value={selectedDistanceId}
            onChange={(id) => {
              const option = DISTANCE_OPTIONS.find((item) => item.id === id);
              if (!option) return;
              setAnswers((current) => ({ ...current, distanceMax: option.maxKm }));
            }}
          />
        )}

        {stepIndex === 4 && (
          <div className="flex flex-col gap-8">
            <QuestionCard
              name="atmosphere"
              question="Qual ambiente combina mais com hoje?"
              options={ATMOSPHERE_OPTIONS}
              value={answers.atmosphere}
              onChange={(id) =>
                setAnswers((current) => ({
                  ...current,
                  atmosphere: id as DiscoveryAnswers["atmosphere"],
                }))
              }
            />
            <QuestionCard
              name="music"
              question="Alguma preferência musical?"
              optional
              options={MUSIC_OPTIONS}
              value={answers.music}
              onChange={(id) =>
                setAnswers((current) => ({
                  ...current,
                  music: id as DiscoveryAnswers["music"],
                }))
              }
            />
          </div>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between gap-4">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className={`inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:border-accent/60 hover:text-accent ${focusRing}`}
          >
            <ArrowIcon direction="left" />
            Voltar
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={goNext}
          disabled={!isStepValid}
          className={`inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
        >
          {stepIndex === TOTAL_STEPS - 1 ? "Ver recomendações" : "Continuar"}
          <ArrowIcon direction="right" />
        </button>
      </div>
    </div>
  );
}
