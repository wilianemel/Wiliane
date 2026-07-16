import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Cliente Supabase para uso em Client Components.
 *
 * Usa apenas a URL e a publishable key públicas — nunca a service role.
 * O SDK gerencia a sessão via cookies do navegador automaticamente.
 */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
