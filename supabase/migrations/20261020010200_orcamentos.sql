-- Orçamentos e suas linhas de insumo.
-- parametros e detalhamento congelam o cálculo: o orçamento não muda se os cadastros mudarem.
-- parametros guarda TODAS as entradas em precisão total e é a fonte para recalcular;
-- as colunas de descrição servem para listar e filtrar.

create type public.status_orcamento as enum ('enviado', 'aprovado', 'recusado', 'entregue');

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  cliente_id uuid,
  filamento_id uuid not null,
  impressora_id uuid not null,
  peca text not null check (length(trim(peca)) > 0),
  quantidade integer not null check (quantidade >= 1),
  pecas_por_mesa integer not null check (pecas_por_mesa >= 1),
  gramas_por_mesa numeric(10,2) not null check (gramas_por_mesa >= 0),
  horas_por_mesa numeric(10,4) not null check (horas_por_mesa >= 0),
  pintado boolean not null default false,
  parametros jsonb not null,
  custo_total numeric(12,2) not null check (custo_total >= 0),
  preco numeric(12,2) not null check (preco >= 0),
  lucro numeric(12,2) not null,
  detalhamento jsonb not null,
  status public.status_orcamento not null default 'enviado',
  status_alterado_em timestamptz not null default now(),
  horas_reais numeric(10,4) check (horas_reais >= 0),
  gramas_reais numeric(10,2) check (gramas_reais >= 0),
  houve_falha boolean,
  observacao_entrega text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- set null só em cliente_id: user_id continua preenchido.
  foreign key (cliente_id, user_id) references public.clientes (id, user_id) on delete set null (cliente_id),
  foreign key (filamento_id, user_id) references public.filamentos (id, user_id) on delete restrict,
  foreign key (impressora_id, user_id) references public.impressoras (id, user_id) on delete restrict
);

create table public.orcamento_insumos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  orcamento_id uuid not null,
  insumo_id uuid,
  nome_snapshot text not null check (length(trim(nome_snapshot)) > 0),
  unidade text not null check (unidade in ('un', 'ml', 'g', 'cm', 'folha')),
  -- sem escala: custo por unidade pode ser bem pequeno (ex.: R$ 6 / 7000 ml)
  custo_unitario_snapshot numeric not null check (custo_unitario_snapshot >= 0),
  quantidade numeric(12,4) not null check (quantidade > 0),
  base text not null check (base in ('peca', 'pedido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (orcamento_id, user_id) references public.orcamentos (id, user_id) on delete cascade,
  foreign key (insumo_id, user_id) references public.insumos (id, user_id) on delete set null (insumo_id)
);

create index orcamentos_user_id_idx on public.orcamentos (user_id);
create index orcamentos_user_status_idx on public.orcamentos (user_id, status, status_alterado_em);
create index orcamentos_cliente_id_idx on public.orcamentos (cliente_id);
create index orcamentos_filamento_id_idx on public.orcamentos (filamento_id);
create index orcamentos_impressora_id_idx on public.orcamentos (impressora_id);
create index orcamento_insumos_user_id_idx on public.orcamento_insumos (user_id);
create index orcamento_insumos_orcamento_id_idx on public.orcamento_insumos (orcamento_id);
create index orcamento_insumos_insumo_id_idx on public.orcamento_insumos (insumo_id);

-- Registra quando o status mudou (usado pelo follow-up).
create function public.set_status_alterado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_alterado_em = now();
  end if;
  return new;
end;
$$;

create trigger orcamentos_status_alterado_em
  before update of status on public.orcamentos
  for each row execute function public.set_status_alterado_em();

do $$
declare
  t text;
begin
  foreach t in array array['orcamentos', 'orcamento_insumos'] loop
    execute format(
      'create trigger %1$s_updated_at before update on public.%1$I
         for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s_select" on public.%1$I for select to authenticated
         using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_insert" on public.%1$I for insert to authenticated
         with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_update" on public.%1$I for update to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_delete" on public.%1$I for delete to authenticated
         using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;
