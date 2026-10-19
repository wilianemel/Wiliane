"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/shared/password-input";
import { createClient } from "@/lib/supabase/client";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type RecoveryStatus = "verifying" | "ready" | "invalid" | "loading" | "success";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [status, setStatus] = useState<RecoveryStatus>("verifying");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function prepareRecovery() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (mounted) setStatus("invalid");
          return;
        }
        if (mounted) setStatus("ready");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (mounted) setStatus(data.session ? "ready" : "invalid");
    }

    void prepareRecovery();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" && session) setStatus("ready");
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "ready") return;

    if (password.length < 6) {
      setErrorMessage("Sua nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("As senhas não são iguais.");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage("Não foi possível alterar a senha. Solicite um novo link e tente novamente.");
      setStatus("ready");
      return;
    }

    await supabase.auth.signOut();
    setStatus("success");
  }

  function goToLogin() {
    const isBusinessAccount = new URLSearchParams(window.location.search).get("origem") === "empresa";
    router.push(isBusinessAccount ? "/empresa/entrar" : "/entrar");
  }

  function requestAnotherLink() {
    const isBusinessAccount = new URLSearchParams(window.location.search).get("origem") === "empresa";
    router.push(isBusinessAccount ? "/empresa/recuperar-senha" : "/recuperar-senha");
  }

  if (status === "verifying") {
    return <main className="mx-auto w-full max-w-md px-4 py-16 text-center text-sm text-muted sm:px-6">Verificando seu link seguro…</main>;
  }

  if (status === "invalid") {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Link inválido ou expirado</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">Solicite outro link para redefinir a senha.</p>
        <button type="button" onClick={requestAnotherLink} className={`mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground ${focusRing}`}>
          Solicitar novo link
        </button>
      </main>
    );
  }

  if (status === "success") {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Senha alterada</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">Sua senha foi atualizada. Entre novamente com a nova senha.</p>
        <button
          type="button"
          onClick={goToLogin}
          className={`mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground ${focusRing}`}
        >
          Ir para o login
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Crie uma nova senha</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">Escolha uma senha com pelo menos 6 caracteres.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="new-password" className="text-sm font-medium text-foreground">Nova senha</label>
          <PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="Digite a nova senha" wrapperClassName="mt-2" required />
        </div>
        <div>
          <label htmlFor="password-confirmation" className="text-sm font-medium text-foreground">Confirme a nova senha</label>
          <PasswordInput id="password-confirmation" autoComplete="new-password" value={confirmation} onChange={setConfirmation} placeholder="Digite novamente a nova senha" wrapperClassName="mt-2" required />
        </div>

        {errorMessage && <p className="rounded-xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">{errorMessage}</p>}

        <button type="submit" disabled={status === "loading"} className={`mt-4 inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${focusRing}`}>
          {status === "loading" ? "Alterando..." : "Salvar nova senha"}
        </button>
      </form>
    </main>
  );
}
