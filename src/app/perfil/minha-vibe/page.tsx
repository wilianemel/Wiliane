import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MinhaVibeForm } from "./minha-vibe-form";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Mesmo padrão de auth já usado em /perfil e /favoritos: Server Component
 * confirma sessão via @/lib/supabase/server; sem usuário, mostra o cartão
 * "não está logado" com CTA pra /entrar — nenhum sistema de autenticação
 * novo, nenhum redirect forçado.
 */
export default async function MinhaVibePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <Link
          href="/perfil"
          className={`inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent ${focusRing} rounded`}
        >
          ← Voltar para o perfil
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">Você não está logado</h1>
        <p className="mt-4 text-sm text-muted">Entre na sua conta para editar sua vibe.</p>
        <Link
          href="/entrar"
          className={`mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.02] ${focusRing}`}
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  // Busca só pra pré-selecionar os chips ao abrir a tela — o salvamento
  // (minha-vibe-form.tsx) busca de novo, na hora de salvar, pra nunca
  // trabalhar com um retrato desatualizado (ver comentário lá).
  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("favorite_categories, favorite_atmospheres, preferred_companions, preferred_music_styles")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <MinhaVibeForm
      userId={user.id}
      initialCategories={preferences?.favorite_categories ?? []}
      initialAtmospheres={preferences?.favorite_atmospheres ?? []}
      initialCompanions={preferences?.preferred_companions ?? []}
      initialMusicStyles={preferences?.preferred_music_styles ?? []}
    />
  );
}
