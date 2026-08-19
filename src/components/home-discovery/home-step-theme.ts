/**
 * Identidade visual das 5 etapas do questionário da Home (HomeMatchFlow) —
 * puramente de apresentação, nunca usada pelo motor de recomendação. As
 * cores por etapa aparecem só em brilhos/gradientes/detalhes; a identidade
 * geral (botão principal, progresso concluído) continua dourada.
 *
 * Os mapas de emoji por opção são chaveados pelo `id` de cada StepOption
 * (steps.ts / companion-options.ts), só para exibição — nunca alteram nem
 * substituem esses ids, que continuam sendo o valor real salvo em
 * DiscoveryAnswers.
 */

export interface HomeStepTheme {
  key: string;
  label: string;
  /** Emoji grande no cabeçalho da etapa, dentro do círculo colorido. */
  icon: string;
  /** Frase curta de orientação, exibida abaixo da pergunta. */
  helper: string;
  /** Cor sólida usada em brilhos, bordas e sombras temáticas da etapa. */
  glow: string;
  /** Mesma cor em rgba, pronta para box-shadow/background com transparência. */
  glowSoft: string;
}

export const HOME_STEP_THEMES: HomeStepTheme[] = [
  {
    key: "intention",
    label: "Momento",
    icon: "🎯",
    helper: "Não existe resposta errada — só a que combina com agora.",
    glow: "#fb7185",
    glowSoft: "rgba(251,113,133,0.35)",
  },
  {
    key: "companion",
    label: "Companhia",
    icon: "👥",
    helper: "Quem vai com você muda o tipo de lugar ideal.",
    glow: "#a78bfa",
    glowSoft: "rgba(167,139,250,0.35)",
  },
  {
    key: "atmosphere",
    label: "Ambiente",
    icon: "🎨",
    helper: "Pense no clima que você quer sentir no lugar.",
    glow: "#34d399",
    glowSoft: "rgba(52,211,153,0.35)",
  },
  {
    key: "budget",
    label: "Orçamento",
    icon: "💰",
    helper: "Uma faixa aproximada já ajuda bastante.",
    glow: "#f59e0b",
    glowSoft: "rgba(245,158,11,0.35)",
  },
  {
    key: "distance",
    label: "Distância",
    icon: "🗺️",
    helper: "Até onde vale a pena ir por essa experiência?",
    glow: "#60a5fa",
    glowSoft: "rgba(96,165,250,0.35)",
  },
];

/** intention (INTENTION_OPTIONS, steps.ts) */
export const INTENTION_ICONS: Record<string, string> = {
  casal: "💕",
  familia: "👨‍👩‍👧",
  amigos: "🥂",
  "musica-ao-vivo": "🎶",
  relaxar: "🌿",
  comemorar: "🎉",
  novidade: "✨",
  surpreenda: "🎲",
};

/** companion (COMPANION_OPTIONS, companion-options.ts) */
export const COMPANION_ICONS: Record<string, string> = {
  sozinho: "🙋",
  casal: "💛",
  familia: "👨‍👩‍👧",
  amigos: "🥂",
  criancas: "🧸",
  pets: "🐾",
};

/** atmosphere (ATMOSPHERE_OPTIONS, steps.ts) */
export const ATMOSPHERE_ICONS: Record<string, string> = {
  tranquilo: "🍃",
  animado: "🔥",
  romantico: "🌹",
  familiar: "🏡",
  sofisticado: "✨",
  casual: "☀️",
};
