"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/shared/password-input";
import { NovoEstabelecimentoForm } from "./novo-estabelecimento-form";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// text-base (16px): abaixo disso o iOS Safari aplica zoom automático ao focar o campo.
const inputClasses = `w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none ${focusRing}`;

/** Versão dos textos legais aceitos no cadastro — some com o próprio texto se ele mudar. */
const TERMS_VERSION = "v1";
const PRIVACY_VERSION = "v1";

type Status = "idle" | "loading" | "error";
type SessionState = "checking" | "unauthenticated" | "authenticated";

export default function CadastroEmpresaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
          />
        </div>
      }
    >
      <CadastroEmpresaContent />
    </Suspense>
  );
}

function CadastroEmpresaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // "novo" (padrão) mantém o cadastro de empresa nova como sempre foi;
  // "existente" é o caminho de quem acha que o Qual é a Boa já pode ter
  // criado a página do estabelecimento (ver /para-empresas) — só muda para
  // onde o cadastro de conta redireciona depois de criado.
  const fluxo = searchParams.get("fluxo") === "existente" ? "existente" : "novo";
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        if (data.user) {
          setUser(data.user);
          setSessionState("authenticated");
        } else {
          setSessionState("unauthenticated");
        }
      } catch (error) {
        // Falha de rede ao verificar a sessão (comum no mobile) nunca deve
        // travar a tela em "checking" para sempre — tratamos como visitante
        // não autenticado, que ainda consegue seguir o fluxo de cadastro.
        console.error("CADASTRO EMPRESA SESSION CHECK ERROR:", error);
        if (!cancelled) setSessionState("unauthenticated");
      }
    }
    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (sessionState === "checking") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <div
          aria-hidden="true"
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
        />
      </div>
    );
  }

  if (sessionState === "authenticated" && user) {
    if (showCreateForm) {
      return (
        <NovoEstabelecimentoForm
          userEmail={user.email ?? ""}
          onCreated={(venueId) => {
            router.push(`/empresa/painel?criado=${venueId}`);
          }}
        />
      );
    }

    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Encontrar meu estabelecimento
        </h1>
        <p className="mt-2 text-sm text-muted">
          Seu estabelecimento pode já estar cadastrado. Procure antes de criar um novo.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/empresa/reivindicar"
            className={`inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
          >
            Buscar estabelecimento
          </Link>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className={`inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
          >
            Cadastrar novo estabelecimento
          </button>
        </div>
      </div>
    );
  }

  return <CriarContaForm fluxo={fluxo} />;
}

function CriarContaForm({ fluxo }: { fluxo: "novo" | "existente" }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    phone.trim().length > 0 &&
    acceptedTerms &&
    status !== "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setErrorMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          terms_accepted_at: new Date().toISOString(),
        },
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/empresa/entrar` : undefined,
      },
    });

    if (error) {
      // Nunca expor o erro técnico do Supabase — só uma mensagem amigável.
      setErrorMessage(
        error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists")
          ? "Já existe uma conta com este e-mail. Tente entrar em vez de criar uma nova."
          : "Não foi possível criar sua conta agora. Verifique os dados e tente novamente.",
      );
      setStatus("error");
      return;
    }

    // Confirmação de e-mail está desligada no projeto (mesmo comportamento
    // já tratado em /cadastro/page.tsx) — signUp() já retorna uma sessão
    // válida, que o SDK persiste sozinho. Nunca mostramos uma tela de
    // "confirme seu e-mail" que não corresponde à configuração real: com
    // sessão, segue direto para o painel da empresa; sem sessão (caso
    // raro/defensivo), cai no login da empresa.
    if (data.session) {
      router.push(fluxo === "existente" ? "/empresa/reivindicar" : "/empresa/painel");
      router.refresh();
    } else {
      router.push(
        fluxo === "existente" ? "/empresa/entrar?next=/empresa/reivindicar" : "/empresa/entrar",
      );
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Criar conta da empresa
      </h1>
      <p className="mt-2 text-sm text-muted">
        {fluxo === "existente"
          ? "Depois de criar sua conta, você procura seu estabelecimento e solicita o gerenciamento."
          : "Depois de criar sua conta, você cadastra os dados do seu estabelecimento."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="full-name" className="text-sm font-medium text-foreground">
            Nome do responsável
          </label>
          <input
            id="full-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Seu nome completo"
            className={`mt-2 ${inputClasses}`}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@empresa.com"
            className={`mt-2 ${inputClasses}`}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Senha
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            placeholder="Mínimo de 6 caracteres"
            minLength={6}
            wrapperClassName="mt-2"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Telefone ou WhatsApp
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(12) 90000-0000"
            className={`mt-2 ${inputClasses}`}
            required
          />
        </div>

        <label className="mt-2 flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-accent"
            required
          />
          <span>
            Li e aceito os{" "}
            <span className="text-foreground underline underline-offset-2">Termos de Uso</span> e a{" "}
            <span className="text-foreground underline underline-offset-2">
              Política de Privacidade
            </span>
            .
          </span>
        </label>

        {errorMessage && (
          <p className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}
        >
          {status === "loading" ? "Criando conta..." : "Criar conta"}
        </button>

        <p className="text-center text-sm text-muted">
          Já tem uma conta?{" "}
          <Link href="/empresa/entrar" className="text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
