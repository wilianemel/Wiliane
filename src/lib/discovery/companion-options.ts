import type { StepOption } from "@/types/discovery";

/**
 * Opções canônicas de "com quem você vai" — fonte única de verdade
 * compartilhada entre o questionário de /descobrir (DiscoveryFlow, motor
 * local determinístico) e o HomeDiscoveryFlow da Home (RPC do Supabase).
 * Nenhum dos dois deve redefinir esta lista.
 *
 * "Grupo" fica de fora por enquanto: hoje existe só no HomeDiscoveryFlow,
 * sem correspondência em VenueCompanionTag, nos `companions` dos venues
 * nem no motor local — não é um valor canônico ainda.
 */
export const COMPANION_OPTIONS: StepOption[] = [
  { id: "sozinho", label: "Sozinho" },
  { id: "casal", label: "Casal" },
  { id: "familia", label: "Família" },
  { id: "amigos", label: "Amigos" },
  { id: "criancas", label: "Crianças" },
  { id: "pets", label: "Pets" },
];
