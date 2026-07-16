import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 *
 * Integra com os cookies do App Router para manter a sessão entre
 * requisições. Sem middleware de autenticação nesta etapa — `setAll` pode
 * falhar silenciosamente quando chamado a partir de um Server Component,
 * o que é esperado até existir um middleware de refresh de sessão.
 */
export async function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Chamado a partir de um Server Component, onde cookies não podem
          // ser escritos. Seguro de ignorar nesta etapa, sem middleware.
        }
      },
    },
  });
}
