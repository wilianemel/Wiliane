import type { BudgetOption, DistanceOption, StepOption } from "@/types/discovery";
import { MOMENT_TAG_GROUPS } from "@/lib/venues/venue-tags";

export const INTENTION_OPTIONS: StepOption[] = [
  { id: "casal", label: "Um momento a dois" },
  { id: "familia", label: "Família" },
  { id: "amigos", label: "Amigos" },
  { id: "musica-ao-vivo", label: "Música ao vivo" },
  { id: "relaxar", label: "Relaxar" },
  { id: "comemorar", label: "Comemorar" },
  { id: "novidade", label: "Conhecer algo novo" },
  { id: "surpreenda", label: "Surpreenda-me" },
];

export const COMPANION_OPTIONS: StepOption[] = [
  { id: "sozinho", label: "Sozinho" },
  { id: "casal", label: "Casal" },
  { id: "familia", label: "Família" },
  { id: "amigos", label: "Amigos" },
];

export const BUDGET_OPTIONS: BudgetOption[] = [
  { id: "ate-80", label: "Até R$ 80", maxPerPerson: 80 },
  { id: "81-150", label: "De R$ 81 a R$ 150", maxPerPerson: 150 },
  { id: "151-250", label: "De R$ 151 a R$ 250", maxPerPerson: 250 },
  { id: "acima-250", label: "Acima de R$ 250", maxPerPerson: 400 },
];

export const DISTANCE_OPTIONS: DistanceOption[] = [
  { id: "ate-5", label: "Até 5 km", maxKm: 5 },
  { id: "ate-10", label: "Até 10 km", maxKm: 10 },
  { id: "ate-20", label: "Até 20 km", maxKm: 20 },
  { id: "ate-30", label: "Até 30 km", maxKm: 30 },
];

export const ATMOSPHERE_OPTIONS: StepOption[] = [
  { id: "tranquilo", label: "Tranquilo" },
  { id: "animado", label: "Animado" },
  { id: "romantico", label: "Romântico" },
  { id: "familiar", label: "Familiar" },
  { id: "sofisticado", label: "Sofisticado" },
  { id: "casual", label: "Casual" },
];

export const MUSIC_OPTIONS: StepOption[] = [
  { id: "sem-preferencia", label: "Sem preferência" },
  { id: "rock", label: "Rock" },
  { id: "mpb", label: "MPB" },
  { id: "sertanejo", label: "Sertanejo" },
  { id: "eletronica", label: "Eletrônica" },
  { id: "ambiente", label: "Música ambiente" },
];

/** Achatado a partir de MOMENT_TAG_GROUPS (venue-tags.ts) — mesma fonte de dados do painel da empresa, sem duplicar as opções aqui. */
export const MOMENT_OPTIONS: StepOption[] = MOMENT_TAG_GROUPS.flatMap((group) => group.options);
