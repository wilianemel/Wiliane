"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

/**
 * Error boundary da rota /lugares/[id] (convenção error.tsx do App Router):
 * até agora nenhuma rota do projeto tinha isso, então qualquer exceção não
 * tratada durante o render (RSC ou client) chegava direto na tela genérica
 * do Next.js "This page couldn't load — A server error occurred" — sem
 * marca, sem contexto, sem saída. Este arquivo é a última linha de defesa:
 * mesmo que algum caso não previsto escape de getPublishedVenueBySlug (que
 * já isola falhas de mídia/Storage) e dos <ErrorBoundary> internos de
 * VenueProfile (que já isolam vídeo/foto/galeria), o usuário nunca mais vê
 * a tela genérica quebrada — sempre uma página com marca, explicação e
 * caminho de volta.
 */
export default function VenuePageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lugares/[id]] Erro não tratado ao renderizar a página do estabelecimento:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <BrandLogo variant="dark" size="medium" />
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">Não foi possível carregar este estabelecimento agora.</h1>
        <p className="max-w-sm text-sm text-muted">
          Isso não afeta o restante do site — tente novamente em instantes ou volte para a busca.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Tentar novamente
        </button>
        <Link
          href="/buscar"
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Voltar para a busca
        </Link>
      </div>
    </div>
  );
}
