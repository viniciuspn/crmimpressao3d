-- Clientes, filamentos, impressoras e insumos.
-- unique (id, user_id) permite FKs compostas: um orçamento só referencia cadastros do mesmo usuário.

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  telefone text,
  email text,
  cidade text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.filamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  tipo text not null default 'PLA'
    check (tipo in ('PLA', 'PLA Silk', 'PLA-CF', 'PETG', 'ABS', 'ASA', 'TPU', 'Tritan', 'Wood', 'Outro')),
  marca text,
  cor text check (cor ~ '^#[0-9a-fA-F]{6}$'),
  preco_rolo numeric(12,2) not null check (preco_rolo >= 0),
  frete numeric(12,2) not null default 0 check (frete >= 0),
  peso_rolo_g integer not null default 1000 check (peso_rolo_g > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.impressoras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  preco numeric(12,2) not null check (preco >= 0),
  vida_util_h integer not null check (vida_util_h > 0),
  consumo_w numeric(8,2) not null check (consumo_w >= 0),
  manutencao_h numeric(12,2) not null default 0 check (manutencao_h >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- qtd_embalagem nula = ainda não preenchida; o insumo não pode entrar em orçamento.
create table public.insumos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  unidade text not null check (unidade in ('un', 'ml', 'g', 'cm', 'folha')),
  preco_pago numeric(12,2) not null check (preco_pago >= 0),
  qtd_embalagem numeric(12,4) check (qtd_embalagem > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index clientes_user_id_idx on public.clientes (user_id);
create index filamentos_user_id_idx on public.filamentos (user_id);
create index impressoras_user_id_idx on public.impressoras (user_id);
create index insumos_user_id_idx on public.insumos (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['clientes', 'filamentos', 'impressoras', 'insumos'] loop
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
