-- Funções comuns e tabela de configurações da oficina (uma linha por usuário).

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Percentuais são guardados em pontos percentuais (5 = 5%).
create table public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  tarifa_kwh numeric(12,4) not null default 1.05 check (tarifa_kwh >= 0),
  desperdicio_pct numeric(5,2) not null default 5 check (desperdicio_pct between 0 and 100),
  taxa_falha_pct numeric(5,2) not null default 8 check (taxa_falha_pct between 0 and 100),
  valor_hora numeric(12,2) not null default 40 check (valor_hora >= 0),
  preparo_min numeric(8,2) not null default 20 check (preparo_min >= 0),
  acabamento_min_peca numeric(8,2) not null default 5 check (acabamento_min_peca >= 0),
  embalagem_pedido numeric(12,2) not null default 3 check (embalagem_pedido >= 0),
  margem_pct numeric(6,2) not null default 80 check (margem_pct >= 0),
  taxa_pagamento_pct numeric(5,2) not null default 0 check (taxa_pagamento_pct >= 0 and taxa_pagamento_pct < 100),
  pedido_minimo numeric(12,2) not null default 30 check (pedido_minimo >= 0),
  retorno_ativo boolean not null default false,
  retorno_meses integer not null default 12 check (retorno_meses > 0),
  retorno_horas_mes integer not null default 160 check (retorno_horas_mes > 0),
  validade_orcamento_dias integer not null default 7 check (validade_orcamento_dias > 0),
  followup_dias integer not null default 7 check (followup_dias > 0),
  pintura_insumos_peca numeric(12,2) not null default 0 check (pintura_insumos_peca >= 0),
  pintura_min_peca numeric(8,2) not null default 0 check (pintura_min_peca >= 0),
  dados_iniciais_criados boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create trigger configuracoes_updated_at
  before update on public.configuracoes
  for each row execute function public.set_updated_at();

alter table public.configuracoes enable row level security;

create policy "configuracoes_select" on public.configuracoes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "configuracoes_update" on public.configuracoes
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- A linha é criada pelo trigger abaixo e nunca apagada pelo app.
-- O usuário só altera os parâmetros; user_id e dados_iniciais_criados ficam fora do alcance.
revoke insert, update, delete on public.configuracoes from anon, authenticated;
grant update (
  tarifa_kwh, desperdicio_pct, taxa_falha_pct, valor_hora, preparo_min, acabamento_min_peca,
  embalagem_pedido, margem_pct, taxa_pagamento_pct, pedido_minimo, retorno_ativo, retorno_meses,
  retorno_horas_mes, validade_orcamento_dias, followup_dias, pintura_insumos_peca, pintura_min_peca
) on public.configuracoes to authenticated;

-- Cria a linha de configurações quando um usuário é criado no Auth.
create function public.criar_configuracoes_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.configuracoes (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.criar_configuracoes_usuario() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_configuracoes_usuario();

-- Usuários criados antes desta migração.
insert into public.configuracoes (user_id)
select id from auth.users
on conflict (user_id) do nothing;
