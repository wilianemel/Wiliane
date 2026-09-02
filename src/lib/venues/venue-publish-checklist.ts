/**
 * Regra única de completude para publicar um estabelecimento — mesmos 5
 * grupos e mesma lógica de public._venue_publish_checklist() no banco
 * (supabase/migrations/20260818220256_simplify_existing_venue_onboarding.sql,
 * SEÇÃO 5, corrigida em remove_cover_photo_publish_requirement). Usada pelo
 * checklist do painel (estabelecimento novo) e pelo checklist do rascunho
 * (estabelecimento já existente) para nunca divergirem entre si nem do que
 * a RPC de conclusão revalida no banco. site/Instagram/link de cardápio/
 * reserva propositalmente NÃO entram aqui — continuam opcionais.
 *
 * CORREÇÃO: foto de capa nunca mais é exigida para publicar — só fotos de
 * galeria e vídeo importam como mídia. Capa continua existindo como campo
 * legado (nunca apagada), só deixou de ser um requisito separado.
 */

export interface PublishChecklistInput {
  name: string;
  category: string;
  description: string;
  city: string;
  neighborhood: string;
  address: string;
  priceRange: string | null | undefined;
  averagePricePerPerson: number | null | undefined;
  whatsappNumber: string | null | undefined;
  whatsapp: string | null | undefined;
  whatsappUrl: string | null | undefined;
  atmospheres: string[] | null | undefined;
  intentions: string[] | null | undefined;
  companions: string[] | null | undefined;
  hoursOk: boolean;
  hasActiveVideo: boolean;
}

export interface PublishChecklistResult {
  basicData: boolean;
  categoryExperience: boolean;
  hours: boolean;
  video: boolean;
  contact: boolean;
  complete: boolean;
}

export const PUBLISH_CHECKLIST_LABELS: Record<Exclude<keyof PublishChecklistResult, "complete">, string> = {
  basicData: "Dados básicos",
  categoryExperience: "Categoria e experiência",
  hours: "Horários",
  video: "Vídeo",
  contact: "Contato",
};

function filled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function computePublishChecklist(input: PublishChecklistInput): PublishChecklistResult {
  const basicData =
    filled(input.name) &&
    filled(input.category) &&
    filled(input.description) &&
    filled(input.city) &&
    filled(input.neighborhood) &&
    filled(input.address) &&
    filled(input.priceRange) &&
    (input.averagePricePerPerson ?? 0) > 0;

  const categoryExperience =
    (input.atmospheres?.length ?? 0) > 0 &&
    (input.intentions?.length ?? 0) > 0 &&
    (input.companions?.length ?? 0) > 0;

  const contact = filled(input.whatsappNumber) || filled(input.whatsapp) || filled(input.whatsappUrl);

  return {
    basicData,
    categoryExperience,
    hours: input.hoursOk,
    video: input.hasActiveVideo,
    contact,
    complete: basicData && categoryExperience && input.hoursOk && input.hasActiveVideo && contact,
  };
}

export function missingChecklistLabels(result: PublishChecklistResult): string[] {
  return (Object.keys(PUBLISH_CHECKLIST_LABELS) as (keyof typeof PUBLISH_CHECKLIST_LABELS)[])
    .filter((key) => !result[key])
    .map((key) => PUBLISH_CHECKLIST_LABELS[key]);
}

export interface SimpleHourEntry {
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

/**
 * Mesma regra de "horário preenchido" usada no banco
 * (_venue_hours_jsonb_is_complete): a lista não pode estar vazia, PELO
 * MENOS UM dia precisa estar marcado como aberto (nunca os 7 dias
 * fechados por padrão, sem terem sido tocados de verdade — esse é
 * também o estado sintético que getVenueBusinessHours devolve quando o
 * venue nunca teve nenhuma linha real gravada, então essa regra sozinha
 * já cobre "nunca configurado"), e nenhum dia aberto pode estar sem
 * horário de abertura ou fechamento.
 */
export function isHoursComplete(hours: SimpleHourEntry[]): boolean {
  if (hours.length === 0) return false;
  if (!hours.some((hour) => !hour.isClosed)) return false;
  return hours.every((hour) => hour.isClosed || (Boolean(hour.opensAt) && Boolean(hour.closesAt)));
}
