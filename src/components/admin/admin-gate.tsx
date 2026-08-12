"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type AdminGateState = "checking" | "denied" | "allowed";

/**
 * Bloqueia o conteúdo até confirmar, no próprio Supabase, que o usuário
 * autenticado tem `profiles.role = 'admin'`. É uma checagem best-effort no
 * cliente — a autoridade real fica nas funções que exigem
 * `is_platform_admin()` (ex.: admin_link_venue_owner) e nas policies de RLS
 * que usam a mesma função; mesmo que alguém burlasse esta tela, qualquer
 * ação de banco continuaria sendo rejeitada.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminGateState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        if (!cancelled) setState("denied");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (cancelled) return;
      setState(profile?.role === "admin" ? "allowed" : "denied");
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <div
          aria-hidden="true"
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
        />
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Acesso restrito</h1>
        <p className="mt-3 text-sm text-muted">
          Esta área é restrita a administradores da plataforma.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
