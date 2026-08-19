"use client";

/**
 * Peças pequenas e compartilhadas do fluxo "empresa já cadastrada"
 * (/empresa/reivindicar → cadastro/login → preencher) — nada aqui fala com
 * o Supabase diretamente, só ajuda o estabelecimento escolhido a
 * sobreviver ao redirecionamento entre essas telas.
 */

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Único formato aceito para o parâmetro `venue` na URL — qualquer outra coisa é tratada como ausente. */
export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export interface SelectedClaimVenue {
  id: string;
  name: string;
  category: string;
  city: string;
  neighborhood: string;
  coverImageUrl: string | null;
}

export const CLAIM_VENUE_STORAGE_KEY = "qual-e-a-boa:claim-venue";

/**
 * Guarda só um resumo para exibição (nome, categoria etc.) — nunca a fonte
 * de verdade de propriedade ou autorização, que sempre vem do banco
 * (start_or_resume_venue_claim revalida tudo com o UUID da URL). Se
 * sessionStorage estiver indisponível (modo privado, etc.), falha em
 * silêncio: a tela seguinte só perde o resumo bonito, nunca a função.
 */
export function storeSelectedClaimVenue(venue: SelectedClaimVenue): void {
  try {
    sessionStorage.setItem(CLAIM_VENUE_STORAGE_KEY, JSON.stringify(venue));
  } catch {
    // Ambiente sem sessionStorage — segue sem o resumo.
  }
}
