"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Sessão do usuário consumidor, disponível globalmente. Espelha o padrão de
 * `city-context.tsx`: contexto simples + hook tolerante para quem só lê, e
 * hook estrito para quem exige um <AuthProvider> acima.
 */

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

/** Para quem só precisa ler o usuário atual (ou null), sem exigir provider. */
export function useUser(): User | null {
  const context = useContext(AuthContext);
  return context?.user ?? null;
}

/** Para quem precisa do estado completo (user + loading). Exige um <AuthProvider> acima. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth() precisa ser usado dentro de <AuthProvider>.");
  }
  return context;
}
