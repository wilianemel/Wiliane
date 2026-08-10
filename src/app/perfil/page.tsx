"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function PerfilPage() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const supabase = createClient();

    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!active) return;
        setRole(typeof data?.role === "string" ? data.role : null);
        setRoleLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <div
          aria-hidden="true"
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Você não está logado</h1>
        <p className="mt-4 text-sm text-muted">Entre na sua conta para ver seu perfil.</p>
        <Link
          href="/entrar"
          className={`mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "Sem nome cadastrado";

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Meu perfil</h1>

      <div className="mt-8 flex flex-col gap-4">
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Nome</p>
          <p className="mt-1 text-sm text-foreground">{fullName}</p>
        </div>

        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">E-mail</p>
          <p className="mt-1 text-sm text-foreground">{user.email}</p>
        </div>

        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Tipo de conta</p>
          <p className="mt-1 text-sm text-foreground">
            {roleLoading ? "Carregando..." : (role ?? "Não identificado")}
          </p>
        </div>
      </div>
    </div>
  );
}
