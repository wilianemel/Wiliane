"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_CITY } from "@/lib/home-discovery/config";

/**
 * Compartilha a cidade escolhida no fluxo de descoberta da Home com o
 * Header, para que o pin deixe de mostrar sempre "São José dos Campos" e
 * reflita a cidade real pesquisada. Não é um novo estado — é o mesmo
 * `city`/`setCity` que já existia isolado em `HomeDiscoveryFlow`, apenas
 * elevado para ser lido por um componente irmão.
 */

interface CityContextValue {
  city: string;
  setCity: (city: string) => void;
}

const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState(DEFAULT_CITY);
  return <CityContext.Provider value={{ city, setCity }}>{children}</CityContext.Provider>;
}

/** Para quem precisa apenas exibir a cidade atual (ex.: Header). Sem provider acima, cai no padrão. */
export function useSelectedCity(): string {
  const context = useContext(CityContext);
  return context?.city ?? DEFAULT_CITY;
}

/** Para quem também precisa alterar a cidade (ex.: o formulário da Home). Exige um <CityProvider> acima. */
export function useCity(): CityContextValue {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error("useCity() precisa ser usado dentro de <CityProvider>.");
  }
  return context;
}
