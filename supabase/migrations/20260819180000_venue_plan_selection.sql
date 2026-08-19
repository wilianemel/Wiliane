-- ============================================================================
-- Migration: venue_plan_selection
-- Permite escolher o plano Básico já no cadastro de um novo estabelecimento
-- (Fluxo 2), SEM ativar automaticamente os limites do Básico — não existe
-- gateway de pagamento configurado (Stripe/Mercado Pago), então a escolha
-- vira só um registro de intenção ("aguardando ativação"), até a equipe
-- confirmar o pagamento pelo WhatsApp e ativar manualmente. O plano ATIVO
-- do venue continua sendo free (via _ensure_venue_plan, já chamada por
-- create_owned_venue) — nada aqui muda esse comportamento.
--
-- Nada é apagado: só estende o CHECK de status (idempotente, mesmo padrão
-- de rollback já documentado no rodapé da migration anterior) e adiciona
-- uma função nova. Nenhuma tabela, RLS, trigger, grant ou regra de negócio
-- já existente é removida.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SEÇÃO 1 — novo status 'pending_payment': um venue pode ter, ao mesmo
-- tempo, um plano 'active' (free, via _ensure_venue_plan) e um registro
-- 'pending_payment' para o plano desejado — o índice único parcial
-- idx_venue_plans_one_active_per_venue só olha status='active', então as
-- duas linhas nunca conflitam.
-- ----------------------------------------------------------------------------
alter table public.venue_plans drop constraint if exists venue_plans_status_check;

alter table public.venue_plans
  add constraint venue_plans_status_check
  check (status in ('active', 'expired', 'canceled', 'pending_payment'));

comment on column public.venue_plans.status is
  'active (plano vigente, no máximo um por estabelecimento — ver índice único parcial) | expired | canceled | pending_payment (escolha registrada pelo dono, aguardando confirmação manual de pagamento — nunca ativa limite nenhum sozinho).';

-- ----------------------------------------------------------------------------
-- SEÇÃO 2 — request_venue_plan: registra a intenção do dono de contratar um
-- plano pago, sem ativar nada. Idempotente (repetir com o mesmo venue+plano
-- não duplica a linha pendente). Só owner/manager ativo do venue ou admin.
-- ----------------------------------------------------------------------------
create or replace function public.request_venue_plan(p_venue_id uuid, p_plan_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_can_manage boolean;
begin
  select
    public.is_platform_admin()
    or exists (
      select 1 from public.venue_members vm
      where vm.venue_id = p_venue_id and vm.user_id = auth.uid() and vm.is_active = true
    )
  into v_can_manage;

  if not v_can_manage then
    raise exception 'Você não tem permissão para alterar o plano deste estabelecimento.';
  end if;

  if not exists (select 1 from public.venue_plan_definitions where plan_type = p_plan_type) then
    raise exception 'Plano inválido.';
  end if;

  if not exists (
    select 1 from public.venue_plans
    where venue_id = p_venue_id and plan_type = p_plan_type and status = 'pending_payment'
  ) then
    insert into public.venue_plans (venue_id, plan_type, click_limit, click_count, started_at, status)
    select p_venue_id, p_plan_type, d.click_limit, 0, now(), 'pending_payment'
    from public.venue_plan_definitions d
    where d.plan_type = p_plan_type;
  end if;
end;
$func$;

comment on function public.request_venue_plan(uuid, text) is
  'Registra que o dono escolheu um plano pago (ex.: básico) — status pending_payment, nunca active. Nunca ativa limite nenhum sozinha: o plano efetivamente em vigor continua sendo o ativo (free, garantido por _ensure_venue_plan). Só a equipe, ao confirmar o pagamento pelo WhatsApp, ativa o plano de fato (ação manual, fora desta função). Idempotente: repetir com o mesmo venue+plano não duplica a linha pendente.';

revoke all on function public.request_venue_plan(uuid, text) from public;
revoke all on function public.request_venue_plan(uuid, text) from anon;
grant execute on function public.request_venue_plan(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- SEÇÃO 3 — admin_list_pending_venue_plans: visibilidade para o admin saber
-- quem já manifestou interesse no Básico e ainda não foi ativado (mesmo
-- padrão de admin_list_venue_plans, SEÇÃO 6 da migration anterior).
-- ----------------------------------------------------------------------------
create or replace function public.admin_list_pending_venue_plans()
returns table (
  venue_id uuid,
  venue_name text,
  plan_type text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $func$
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado: apenas administradores podem ver planos.';
  end if;

  return query
    select v.id, v.name, p.plan_type, p.started_at
    from public.venues v
    join public.venue_plans p on p.venue_id = v.id and p.status = 'pending_payment'
    order by p.started_at desc;
end;
$func$;

comment on function public.admin_list_pending_venue_plans() is
  'Lista, só para admin, os estabelecimentos com um plano pago escolhido (pending_payment) ainda não confirmado/ativado — fila de contatos pendentes pelo WhatsApp.';

revoke all on function public.admin_list_pending_venue_plans() from public;
revoke all on function public.admin_list_pending_venue_plans() from anon;
grant execute on function public.admin_list_pending_venue_plans() to authenticated;
