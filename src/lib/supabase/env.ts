/**
 * Validação de configuração do Supabase.
 *
 * Nunca loga, imprime ou inclui os valores das variáveis em mensagens de
 * erro — apenas confirma que estão definidas. Sem isso, os clientes de
 * `client.ts` e `server.ts` não devem ser instanciados.
 */

interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Configuração do Supabase ausente: defina ${missing} em .env.local.`,
    );
  }

  return { url, publishableKey };
}
