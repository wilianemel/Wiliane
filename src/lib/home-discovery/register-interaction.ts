import { createClient } from "@/lib/supabase/client";

/** Mesmo vocabulário do enum `public.interaction_type` no Supabase. */
export type InteractionType = "visualizou" | "salvou" | "favoritou" | "ignorou" | "visitou";

/**
 * Registra uma interação do usuário com um estabelecimento — de forma
 * best-effort, nunca bloqueando nem quebrando a interface.
 *
 * Ainda não existe login implementado no front-end. Sem uma sessão
 * autenticada não há `p_user_id` real disponível, e não inventamos um
 * usuário fictício só para preencher o parâmetro — a chamada é
 * simplesmente ignorada nesse caso. Qualquer erro de rede ou do Supabase
 * também é silenciado aqui: registrar a interação é um efeito colateral,
 * nunca deve impedir o usuário de abrir o estabelecimento.
 */
export async function registerUserInteraction(
  venueId: string,
  interaction: InteractionType,
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) return;

    await supabase.rpc("register_user_interaction", {
      p_user_id: userId,
      p_venue_id: venueId,
      p_interaction: interaction,
    });
  } catch {
    // Best-effort: falha silenciosa, por design.
  }
}
