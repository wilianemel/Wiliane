import { redirect } from "next/navigation";

/**
 * CORREÇÃO (decisão final do fluxo empresarial): aprovação manual
 * descontinuada — estabelecimento existente e novo publicam
 * automaticamente pelo próprio painel do empresário
 * (complete_existing_venue_onboarding()/complete_new_venue_onboarding()).
 * Esta rota não expõe mais Aprovar/Recusar; nenhum dado histórico é
 * apagado (venue_claim_requests continua intacta), só a tela deixou de
 * existir — quem tinha o link salvo cai direto no painel administrativo.
 */
export default function AdminSolicitacoesRedirectPage() {
  redirect("/admin");
}
