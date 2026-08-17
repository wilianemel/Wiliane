"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TagToggleButton, toggleValue } from "@/components/empresa/tag-toggle-button";
import {
  VIBE_CATEGORY_OPTIONS,
  VIBE_ATMOSPHERE_OPTIONS,
  VIBE_COMPANION_OPTIONS,
  VIBE_MUSIC_OPTIONS,
  mergeManagedSelection,
} from "@/lib/user-intelligence/vibe-preferences";
import type { TagOption } from "@/lib/venues/venue-tags";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface MinhaVibeFormProps {
  userId: string;
  initialCategories: string[];
  initialAtmospheres: string[];
  initialCompanions: string[];
  initialMusicStyles: string[];
}

function VibeGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: TagOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</legend>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {options.map((option) => (
          <TagToggleButton
            key={option.id}
            label={option.label}
            isActive={selected.includes(option.id)}
            onClick={() => onToggle(option.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function MinhaVibeForm({
  userId,
  initialCategories,
  initialAtmospheres,
  initialCompanions,
  initialMusicStyles,
}: MinhaVibeFormProps) {
  // Só os valores que esta tela realmente exibe entram no estado inicial —
  // qualquer coisa fora da taxonomia gerenciada (categoria antiga, atmosfera
  // de outro grupo etc.) fica de fora daqui, mas continua intacta no banco
  // até o momento de salvar (ver mergeManagedSelection em handleSave).
  const [categories, setCategories] = useState<string[]>(() =>
    initialCategories.filter((value) => VIBE_CATEGORY_OPTIONS.includes(value)),
  );
  const [atmospheres, setAtmospheres] = useState<string[]>(() =>
    initialAtmospheres.filter((value) => VIBE_ATMOSPHERE_OPTIONS.some((option) => option.id === value)),
  );
  const [companions, setCompanions] = useState<string[]>(() =>
    initialCompanions.filter((value) => VIBE_COMPANION_OPTIONS.some((option) => option.id === value)),
  );
  const [musicStyles, setMusicStyles] = useState<string[]>(() =>
    initialMusicStyles.filter((value) => VIBE_MUSIC_OPTIONS.some((option) => option.id === value)),
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalSelected =
    categories.length + atmospheres.length + companions.length + musicStyles.length;

  async function handleSave() {
    if (status === "saving") return;

    setStatus("saving");
    setErrorMessage(null);

    const supabase = createClient();

    // Busca o estado mais recente de user_preferences agora, na hora de
    // salvar — não reaproveita o retrato inicial da página, porque algo
    // pode ter sido aprendido nesse meio-tempo (ex.: o usuário favoritou um
    // estabelecimento em outra aba). Sem isso, o merge abaixo preservaria
    // um valor já desatualizado em vez do mais recente.
    const { data: current, error: fetchError } = await supabase
      .from("user_preferences")
      .select("favorite_categories, favorite_atmospheres, preferred_companions, preferred_music_styles")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("MINHA VIBE FETCH BEFORE SAVE ERROR:", fetchError);
      setErrorMessage("Não foi possível salvar agora. Tente novamente em instantes.");
      setStatus("error");
      return;
    }

    const nextCategories = mergeManagedSelection(
      current?.favorite_categories ?? [],
      VIBE_CATEGORY_OPTIONS,
      categories,
    );
    const nextAtmospheres = mergeManagedSelection(
      current?.favorite_atmospheres ?? [],
      VIBE_ATMOSPHERE_OPTIONS.map((option) => option.id),
      atmospheres,
    );
    const nextCompanions = mergeManagedSelection(
      current?.preferred_companions ?? [],
      VIBE_COMPANION_OPTIONS.map((option) => option.id),
      companions,
    );
    const nextMusicStyles = mergeManagedSelection(
      current?.preferred_music_styles ?? [],
      VIBE_MUSIC_OPTIONS.map((option) => option.id),
      musicStyles,
    );

    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        favorite_categories: nextCategories,
        favorite_atmospheres: nextAtmospheres,
        preferred_companions: nextCompanions,
        preferred_music_styles: nextMusicStyles,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("MINHA VIBE SAVE ERROR:", error);
      setErrorMessage("Não foi possível salvar agora. Tente novamente em instantes.");
      setStatus("error");
      return;
    }

    setStatus("saved");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-8 sm:px-6 sm:pb-16 sm:pt-10">
      <Link
        href="/perfil"
        className={`inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent ${focusRing} rounded`}
      >
        ← Voltar para o perfil
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Minha vibe
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
        Conte o que você curte e deixe suas recomendações cada vez mais a sua cara.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <VibeGroup
          title="Categorias"
          options={VIBE_CATEGORY_OPTIONS.map((category) => ({ id: category, label: category }))}
          selected={categories}
          onToggle={(id) => setCategories((current) => toggleValue(current, id))}
        />
        <VibeGroup
          title="Clima"
          options={VIBE_ATMOSPHERE_OPTIONS}
          selected={atmospheres}
          onToggle={(id) => setAtmospheres((current) => toggleValue(current, id))}
        />
        <VibeGroup
          title="Com quem"
          options={VIBE_COMPANION_OPTIONS}
          selected={companions}
          onToggle={(id) => setCompanions((current) => toggleValue(current, id))}
        />
        <VibeGroup
          title="Música"
          options={VIBE_MUSIC_OPTIONS}
          selected={musicStyles}
          onToggle={(id) => setMusicStyles((current) => toggleValue(current, id))}
        />
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed text-muted sm:text-sm">
        {totalSelected > 0
          ? `Quanto mais você conta sobre sua vibe, melhores ficam as recomendações. Você já escolheu ${totalSelected}.`
          : "Escolha o que realmente combina com você."}
      </p>

      {errorMessage && (
        <p className="mt-4 rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-center text-sm text-red-300">
          {errorMessage}
        </p>
      )}
      {status === "saved" && (
        <p className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-center text-sm text-emerald-300">
          Sua vibe foi salva.
        </p>
      )}

      {/* Desktop: botão segue no fluxo normal da página. */}
      <button
        type="button"
        onClick={handleSave}
        disabled={status === "saving"}
        className={`mt-8 hidden w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 md:inline-flex ${focusRing}`}
      >
        {status === "saving" ? "Salvando..." : "Salvar minha vibe"}
      </button>

      {/* Mobile: barra fixa acima da bottom nav global — nunca sobre os
          chips (fica só quando o usuário rola até o fim), nunca atrás da
          bottom nav (bottom = altura da BottomNav + safe-area, ver
          bottom-nav.tsx) e com a própria safe-area respeitada. */}
      <div
        className="fixed inset-x-0 z-30 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur md:hidden"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
        >
          {status === "saving" ? "Salvando..." : "Salvar minha vibe"}
        </button>
      </div>
    </div>
  );
}
