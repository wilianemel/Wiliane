"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getRecommendations } from "@/lib/match-engine";
import type { DiscoveryAnswers, MatchResult, StepOption } from "@/types/discovery";
import { Results } from "@/components/discovery/results";
import { VenueProfile } from "@/components/venues/venue-profile";
import {
  ATMOSPHERE_OPTIONS,
  BUDGET_OPTIONS,
  DISTANCE_OPTIONS,
  INTENTION_OPTIONS,
} from "@/components/discovery/steps";
import { COMPANION_OPTIONS } from "@/lib/discovery/companion-options";
import { registerUserInteraction } from "@/lib/home-discovery/register-interaction";
import type { Venue } from "@/data/venues";
import { useUser } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { UserPreferencesRow } from "@/lib/user-intelligence/preference-score";
import { saveRecommendationHistory } from "@/lib/recommendations/save-recommendation-history";
import { VenueViewTracker } from "@/components/analytics/venue-view-tracker";
import type { VenueHoursStatus } from "@/lib/venues/venue-hours";
import { HomeQuestionCard } from "@/components/home-discovery/home-question-card";
import { HomeProgressSteps } from "@/components/home-discovery/home-progress-steps";
import {
  HOME_STEP_THEMES,
  INTENTION_ICONS,
  COMPANION_ICONS,
  ATMOSPHERE_ICONS,
} from "@/components/home-discovery/home-step-theme";

/**
 * Fluxo de decisão principal da Home — reaproveita as mesmas peças do
 * DiscoveryFlow (Results, VenueProfile, match-engine.ts), só que com 5
 * etapas em vez de 5+música+momento+cidade. `discovery-flow.tsx` não é
 * alterado nem usado aqui.
 *
 * A parte visual das perguntas (cabeçalho temático, cartões de opção,
 * progresso) usa HomeQuestionCard/HomeProgressSteps — variantes só desta
 * tela, para não mudar QuestionCard/ProgressBar usados por
 * DiscoveryFlow/HomeDiscoveryFlow (hoje sem nenhuma rota renderizando
 * nenhum dos dois, mas continuam existindo).
 */

const TOTAL_STEPS = 5;
const LOADING_DURATION_MS = 700;

/** Barras crescentes — mesma ideia de "$/$$/$$$" já usada no filtro de Buscar, só que com 4 níveis e sem repetir o glifo "R$" quatro vezes. */
function BudgetBadge({ tier, color }: { tier: number; color: string }) {
  return (
    <span aria-hidden="true" className="flex items-end gap-0.5">
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className="w-1.5 rounded-sm transition-colors duration-200"
          style={{
            height: `${6 + bar * 3}px`,
            backgroundColor: bar <= tier ? color : "var(--border)",
          }}
        />
      ))}
    </span>
  );
}

/** Marcador de localização + trilha de pontos crescente — "quanto mais longe, mais pontos no trajeto". */
function DistanceBadge({ tier, color }: { tier: number; color: string }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      <span className="text-xl leading-none">📍</span>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4].map((dot) => (
          <span
            key={dot}
            className="h-1.5 w-1.5 rounded-full transition-colors duration-200"
            style={{ backgroundColor: dot <= tier ? color : "var(--border)" }}
          />
        ))}
      </span>
    </span>
  );
}

// music/moment ficam nos valores neutros (sem-preferencia / null) e nunca
// são alterados neste fluxo — buildReasons() já não gera motivo pra eles
// nesse caso, e getRecommendations(..., { includeOptionalCriteria: false })
// os exclui do cálculo e da normalização do percentual.
const INITIAL_ANSWERS: DiscoveryAnswers = {
  intention: null,
  companion: null,
  budgetMax: null,
  distanceMax: null,
  atmosphere: null,
  music: "sem-preferencia",
  moment: null,
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
        Encontrando lugares que combinam com você...
      </p>
      <p className="text-sm text-muted">
        Estamos cruzando suas escolhas com as melhores experiências disponíveis.
      </p>
    </div>
  );
}

export function HomeMatchFlow({
  venues,
  hoursStatusByVenueId,
}: {
  venues: Venue[];
  /** venue.venueId -> status calculado no servidor — ver comentário equivalente em search-page.tsx. */
  hoursStatusByVenueId?: Record<string, VenueHoursStatus>;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  // Só decide se a animação de transição da próxima etapa entra pela
  // direita (Continuar) ou pela esquerda (Voltar) — puramente visual, não
  // participa de isStepValid, goBack, goNext nem de nenhuma regra deles.
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<DiscoveryAnswers>(INITIAL_ANSWERS);
  const [phase, setPhase] = useState<Phase>("questions");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<MatchResult | null>(null);
  const [recommendationHistoryIds, setRecommendationHistoryIds] = useState<Record<string, string>>(
    {},
  );
  const user = useUser();
  const [userPreferences, setUserPreferences] = useState<UserPreferencesRow | null>(null);

  // Camada de personalização: busca o histórico declarado do usuário (se
  // logado) para alimentar o bônus opcional em getRecommendations(). Sem
  // sessão, ou se a busca falhar, userPreferences fica null — o motor trata
  // isso como "sem histórico" e não aplica nenhum bônus (ver preference-score.ts).
  useEffect(() => {
    let active = true;

    if (!user) {
      Promise.resolve().then(() => {
        if (active) setUserPreferences(null);
      });
      return () => {
        active = false;
      };
    }

    const supabase = createClient();
    supabase
      .from("user_preferences")
      .select("favorite_categories, favorite_atmospheres, preferred_companions")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("USER PREFERENCES FETCH ERROR:", error);
          setUserPreferences(null);
          return;
        }
        setUserPreferences(data);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (phase !== "loading") return;

    const timer = setTimeout(() => {
      const recommendations = getRecommendations(answers, venues, {
        includeOptionalCriteria: false,
        userPreferences,
        hoursStatusByVenueId,
      });
      setResults(recommendations);
      setPhase("results");
      setRecommendationHistoryIds({});

      // Best-effort: guarda a memória da recomendação. Não bloqueia a tela
      // se falhar (ver save-recommendation-history.ts). Sem usuário logado,
      // não há user_id — o histórico simplesmente não é salvo. O vínculo
      // venue_id → recommendation_history.id chega depois, de forma
      // assíncrona — o botão de feedback só aparece quando ele existir.
      if (user) {
        saveRecommendationHistory({ userId: user.id, results: recommendations, answers }).then(
          (links) => {
            const map: Record<string, string> = {};
            links.forEach((link) => {
              map[link.venueId] = link.recommendationHistoryId;
            });
            setRecommendationHistoryIds(map);
          },
        );
      }
    }, LOADING_DURATION_MS);

    return () => clearTimeout(timer);
  }, [phase, answers, venues, userPreferences, user, hoursStatusByVenueId]);

  // Best-effort: registra a visualização de cada resultado exibido. A
  // própria registerUserInteraction() já engole erro/sessão ausente
  // internamente — nada aqui pode quebrar a experiência do usuário.
  useEffect(() => {
    if (phase !== "results") return;
    results.forEach((result) => {
      void registerUserInteraction(result.venue.id, "visualizou");
    });
  }, [phase, results]);

  const isStepValid = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return answers.intention !== null;
      case 1:
        return answers.companion !== null;
      case 2:
        return answers.atmosphere !== null;
      case 3:
        return answers.budgetMax !== null;
      case 4:
        return answers.distanceMax !== null;
      default:
        return false;
    }
  }, [stepIndex, answers]);

  function goBack() {
    setDirection(-1);
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (!isStepValid) return;
    if (stepIndex === TOTAL_STEPS - 1) {
      setPhase("loading");
      return;
    }
    setDirection(1);
    setStepIndex((current) => Math.min(TOTAL_STEPS - 1, current + 1));
  }

  function restart() {
    setAnswers(INITIAL_ANSWERS);
    setStepIndex(0);
    setDirection(1);
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
      <>
        <VenueViewTracker venueId={selectedResult.venue.venueId} />
        <VenueProfile
          venue={selectedResult.venue}
          match={{ score: selectedResult.score, reasons: selectedResult.reasons }}
          backLabel="Voltar para os resultados"
          onBack={backToResults}
          onRestart={restart}
        />
      </>
    );
  }

  if (phase === "results") {
    return (
      <Results
        results={results}
        onRestart={restart}
        onSelect={selectResult}
        recommendationHistoryIds={recommendationHistoryIds}
        hoursStatusByVenueId={hoursStatusByVenueId}
      />
    );
  }

  const selectedBudgetId =
    BUDGET_OPTIONS.find((option) => option.maxPerPerson === answers.budgetMax)?.id ?? null;
  const selectedDistanceId =
    DISTANCE_OPTIONS.find((option) => option.maxKm === answers.distanceMax)?.id ?? null;

  const theme = HOME_STEP_THEMES[stepIndex];
  const fadeDirectionClass =
    direction === 1 ? "animate-step-fade-forward" : "animate-step-fade-backward";

  let stepContent: ReactNode = null;
  if (stepIndex === 0) {
    stepContent = (
      <HomeQuestionCard
        name="intention"
        theme={theme}
        question="O que seu momento está pedindo?"
        options={INTENTION_OPTIONS}
        icons={INTENTION_ICONS}
        value={answers.intention}
        onChange={(id) =>
          setAnswers((current) => ({
            ...current,
            intention: id as DiscoveryAnswers["intention"],
          }))
        }
      />
    );
  } else if (stepIndex === 1) {
    stepContent = (
      <HomeQuestionCard
        name="companion"
        theme={theme}
        question="Com quem você vai?"
        options={COMPANION_OPTIONS}
        icons={COMPANION_ICONS}
        value={answers.companion}
        onChange={(id) =>
          setAnswers((current) => ({
            ...current,
            companion: id as DiscoveryAnswers["companion"],
          }))
        }
      />
    );
  } else if (stepIndex === 2) {
    stepContent = (
      <HomeQuestionCard
        name="atmosphere"
        theme={theme}
        question="Que tipo de ambiente combina com você agora?"
        options={ATMOSPHERE_OPTIONS}
        icons={ATMOSPHERE_ICONS}
        value={answers.atmosphere}
        onChange={(id) =>
          setAnswers((current) => ({
            ...current,
            atmosphere: id as DiscoveryAnswers["atmosphere"],
          }))
        }
      />
    );
  } else if (stepIndex === 3) {
    stepContent = (
      <HomeQuestionCard
        name="budget"
        theme={theme}
        question="Quanto pretende gastar por pessoa?"
        options={BUDGET_OPTIONS}
        value={selectedBudgetId}
        renderBadge={(option: StepOption, index: number) => (
          <BudgetBadge tier={index + 1} color={theme.glow} />
        )}
        onChange={(id) => {
          const option = BUDGET_OPTIONS.find((item) => item.id === id);
          if (!option) return;
          setAnswers((current) => ({ ...current, budgetMax: option.maxPerPerson }));
        }}
      />
    );
  } else if (stepIndex === 4) {
    stepContent = (
      <HomeQuestionCard
        name="distance"
        theme={theme}
        question="Até que distância você toparia ir?"
        options={DISTANCE_OPTIONS}
        value={selectedDistanceId}
        renderBadge={(option: StepOption, index: number) => (
          <DistanceBadge tier={index + 1} color={theme.glow} />
        )}
        onChange={(id) => {
          const option = DISTANCE_OPTIONS.find((item) => item.id === id);
          if (!option) return;
          setAnswers((current) => ({ ...current, distanceMax: option.maxKm }));
        }}
      />
    );
  }

  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      />

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent sm:text-sm">
          Menos tempo procurando. Mais tempo vivendo.
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:mt-4 sm:text-3xl">
          Descubra seu próximo rolê em poucos passos
        </h2>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Escolha o que combina com seu momento. A gente cuida do resto.
        </p>

        {/* Cartão visual do questionário — largura própria (mais estreita
            que o texto de abertura acima) para não ficar esticado demais no
            desktop. Fundo escuro com dois brilhos desfocados que trocam de
            cor conforme a etapa (background-color e box-shadow são
            propriedades nativamente animáveis por CSS — a transição
            acontece sozinha, sem depender de nenhuma lib). */}
        <div className="relative mx-auto mt-6 max-w-2xl overflow-hidden rounded-[28px] border border-border/60 bg-background-elevated/80 p-5 shadow-xl shadow-black/30 transition-shadow duration-500 sm:mt-8 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-10 h-56 w-56 rounded-full blur-[90px] transition-colors duration-500"
            style={{ backgroundColor: theme.glowSoft }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-10 h-56 w-56 rounded-full blur-[90px] transition-colors duration-500"
            style={{ backgroundColor: theme.glowSoft }}
          />

          <div className="relative">
            <HomeProgressSteps currentStep={stepIndex + 1} themes={HOME_STEP_THEMES} />

            {/* `key={stepIndex}` força o React a remontar este bloco a cada
                troca de etapa, o que reinicia a animação CSS abaixo (fade +
                deslocamento lateral/vertical, direção conforme Continuar ou
                Voltar) — sem biblioteca de animação, sem alterar a lógica
                de navegação. Respeita prefers-reduced-motion (globals.css). */}
            <div key={stepIndex} className={`${fadeDirectionClass} mt-6 sm:mt-8`}>
              {stepContent}
            </div>

            {/* Sem espaçador invisível na 1ª etapa: sem Voltar, o botão
                principal ocupa a linha inteira (flex-1); com Voltar
                presente, ele preenche o restante do espaço no celular e
                volta a ficar alinhado à direita, do tamanho do texto, no
                desktop (sm:ml-auto sm:flex-none) — igual ao comportamento
                de sempre lá. */}
            <div className="mt-6 flex items-center gap-3 sm:mt-10">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:border-accent/60 hover:text-accent active:scale-[0.97] ${focusRing}`}
                >
                  <ArrowIcon direction="left" />
                  Voltar
                </button>
              )}

              <button
                type="button"
                onClick={goNext}
                disabled={!isStepValid}
                className={`group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-[#ffb020] px-6 py-4 text-sm font-bold text-accent-foreground transition-all hover:scale-[1.02] hover:shadow-[0_0_32px_-6px_rgba(255,194,30,0.65)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none active:scale-[0.98] sm:ml-auto sm:flex-none ${focusRing}`}
              >
                {stepIndex === TOTAL_STEPS - 1 ? "Ver minhas recomendações" : "Continuar"}
                <span className="transition-transform duration-200 group-hover:translate-x-1">
                  <ArrowIcon direction="right" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
