"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { OWNER_VENUE_COLUMNS, type VenueOwnerRow } from "@/lib/venues/venue-owner";
import { VenueCoverImage } from "@/components/shared/venue-cover-image";
import { OnboardingChecklist } from "@/components/empresa/onboarding-checklist";
import { ExperienceQuestions } from "@/components/empresa/experience-questions";
import { VenueMediaOnboarding } from "@/components/empresa/venue-media-onboarding";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const buttonBase = `rounded-full border border-border px-4 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`;

/** Fallback neutro para os cards do painel — não é a mesma paleta cosmética usada nos cards públicos. */
const OWNER_CARD_GRADIENT = "from-zinc-700/40 via-zinc-900 to-black";

/**
 * "error" é um estado distinto de "ready com memberships vazio" — a consulta
 * pode falhar (RLS, embed do PostgREST, sessão, etc.) sem que isso signifique
 * que o usuário realmente não tem estabelecimento. Ver refreshMemberships().
 */
type LoadState = "checking" | "ready" | "error";

interface Membership {
  member_role: string;
  venues: VenueOwnerRow;
}

export default function PainelEmpresaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        </div>
      }
    >
      <PainelEmpresaContent />
    </Suspense>
  );
}

function PainelEmpresaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createdVenueId = searchParams.get("criado");

  const [loadState, setLoadState] = useState<LoadState>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  // RLS de venue_members já restringe a linhas com user_id = auth.uid(); o
  // embed de venues só traz o que o vínculo ativo permite enxergar.
  //
  // Retorna true/false (sucesso ou falha da consulta) em vez de void — quem
  // chama decide o que fazer com o loadState a partir disso. Antes, o `error`
  // do Supabase era descartado e qualquer falha virava silenciosamente um
  // array vazio, indistinguível de "usuário realmente não tem
  // estabelecimento" (causa raiz do loop de cadastro duplicado).
  async function refreshMemberships(userId: string): Promise<boolean> {
    const supabase = createClient();
    const { data: memberRows, error } = await supabase
      .from("venue_members")
      .select(`member_role, venues (${OWNER_VENUE_COLUMNS})`)
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      // LOG TEMPORÁRIO — remover assim que a causa raiz real for confirmada
      // e corrigida. Objetivo: capturar código/mensagem/detalhes exatos do
      // PostgREST em vez de continuar adivinhando por que o painel não
      // reconhece um vínculo que existe no banco.
      console.error("PAINEL EMPRESA — falha ao buscar venue_members:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return false;
    }

    setMemberships(
      ((memberRows ?? []) as unknown as Membership[]).filter((row) => row.venues != null),
    );
    return true;
  }

  async function handleRetry() {
    if (!user) return;
    setLoadState("checking");
    const ok = await refreshMemberships(user.id);
    setLoadState(ok ? "ready" : "error");
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        // LOG TEMPORÁRIO — mesma finalidade do log acima, para a etapa de
        // verificação de sessão.
        console.error("PAINEL EMPRESA — falha ao buscar sessão:", {
          message: error.message,
        });
      }

      if (!data.user) {
        router.replace("/empresa/entrar");
        return;
      }

      if (cancelled) return;
      setUser(data.user);
      const ok = await refreshMemberships(data.user.id);
      if (cancelled) return;
      setLoadState(ok ? "ready" : "error");
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const featuredMembership =
    memberships.find((membership) => membership.venues.id === createdVenueId) ??
    memberships.find((membership) => !membership.venues.is_published);

  // `?criado=<id>` só existe na URL logo após um cadastro bem-sucedido
  // (ver novo-estabelecimento-form.tsx → onCreated). Se chegamos aqui e
  // `memberships` está vazio mesmo assim, o venue e o vínculo existem no
  // banco (create_owned_venue já criou os dois atomicamente) — o que falhou
  // foi só a LEITURA de volta (RLS ou atraso de propagação), não a criação.
  // Nunca mostramos "você ainda não tem um estabelecimento" nesse caso: essa
  // mensagem é falsa e é exatamente o que levava a pessoa a clicar em
  // "Cadastrar" de novo e criar um estabelecimento duplicado a cada
  // tentativa.
  const justCreatedButNotVisibleYet = Boolean(createdVenueId) && memberships.length === 0;

  if (loadState === "checking") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <div
          aria-hidden="true"
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
        />
      </div>
    );
  }

  // Estado distinto de "sem estabelecimento" — a consulta falhou de verdade
  // (ver console para o erro real vindo do Supabase). Nunca reaproveita a
  // mensagem "você ainda não tem um estabelecimento cadastrado" aqui: seria
  // falsa e reabriria o mesmo loop de cadastro duplicado.
  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Não foi possível carregar seu painel
        </h1>
        <p className="mt-3 text-sm text-muted">
          Houve uma falha ao buscar seus estabelecimentos agora. Isso não significa que você não
          tem nenhum cadastrado — tente novamente em instantes.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className={`mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Painel da empresa
          </h1>
          {user?.email && <p className="mt-1 text-sm text-muted">{user.email}</p>}
        </div>
        <button type="button" onClick={handleSignOut} className={buttonBase}>
          Sair da conta
        </button>
      </div>

      {featuredMembership && (
        <div className="mt-8 flex flex-col gap-6">
          <OnboardingChecklist
            venue={featuredMembership.venues}
            justCreated={featuredMembership.venues.id === createdVenueId}
            onPublished={() => user && refreshMemberships(user.id)}
          />
          <ExperienceQuestions
            venue={featuredMembership.venues}
            onSaved={() => user && refreshMemberships(user.id)}
          />
          <VenueMediaOnboarding
            venue={featuredMembership.venues}
            onVenueUpdated={() => user && refreshMemberships(user.id)}
          />
        </div>
      )}

      {justCreatedButNotVisibleYet ? (
        <div className="mt-8 rounded-2xl border border-accent/40 bg-accent/5 p-6">
          <p className="text-base font-medium text-foreground">
            Seu estabelecimento foi cadastrado.
          </p>
          <p className="mt-2 text-sm text-muted">
            Ainda estamos sincronizando os dados — isso pode levar alguns instantes. Atualize para
            continuar.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className={`mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
          >
            Atualizar
          </button>
        </div>
      ) : memberships.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-background-elevated p-6">
          <p className="text-base font-medium text-foreground">
            Você ainda não tem um estabelecimento cadastrado.
          </p>
          <p className="mt-2 text-sm text-muted">
            Cadastre seu estabelecimento para começar a gerenciar fotos, vídeo e informações.
          </p>
          <Link
            href="/empresa/cadastro"
            className={`mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
          >
            Cadastrar meu estabelecimento
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {memberships.map(({ venues: venue, member_role }) => (
            <li
              key={venue.id}
              className="overflow-hidden rounded-2xl border border-border bg-background-elevated"
            >
              <div className="flex flex-col sm:flex-row">
                <VenueCoverImage
                  venue={{ coverImageUrl: venue.cover_image_url ?? undefined, gradient: OWNER_CARD_GRADIENT, name: venue.name }}
                  className="h-32 w-full sm:h-auto sm:w-40 sm:shrink-0"
                  sizes="(min-width: 640px) 160px, 100vw"
                />
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-foreground">{venue.name}</p>
                      <p className="text-xs text-muted">
                        {venue.category} · {venue.neighborhood}, {venue.city}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                          venue.is_published
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {venue.is_published ? "Publicado" : "Não publicado"}
                      </span>
                      <span className="rounded-full bg-border/40 px-3 py-1 text-[11px] text-muted">
                        {member_role === "owner" ? "Proprietário" : "Gestor"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/empresa/painel/${venue.id}/editar`} className={buttonBase}>
                      Editar dados
                    </Link>
                    <Link href={`/empresa/painel/${venue.id}/midias`} className={buttonBase}>
                      Fotos e vídeo
                    </Link>
                    <Link href={`/empresa/painel/${venue.id}/preview`} className={buttonBase}>
                      Prévia
                    </Link>
                    <Link href={`/empresa/painel/${venue.id}/dashboard`} className={buttonBase}>
                      Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
