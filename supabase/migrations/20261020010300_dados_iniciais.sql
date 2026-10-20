-- Dados iniciais (seção 5 da spec), criados no primeiro acesso do usuário logado.
-- security definer porque marca configuracoes.dados_iniciais_criados, que o usuário não pode alterar.
-- Todas as linhas são gravadas com user_id = auth.uid() explicitamente.
-- Idempotente: marca configuracoes.dados_iniciais_criados.

create function public.criar_dados_iniciais()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'não autenticado';
  end if;

  insert into public.configuracoes (user_id) values (uid)
  on conflict (user_id) do nothing;

  update public.configuracoes
     set dados_iniciais_criados = true
   where user_id = uid and not dados_iniciais_criados;

  if not found then
    return false;
  end if;

  insert into public.impressoras (user_id, nome, preco, vida_util_h, consumo_w, manutencao_h)
  values (uid, 'Creality K1C', 3000, 6000, 120, 0.40);

  insert into public.filamentos (user_id, nome, tipo, preco_rolo, peso_rolo_g)
  values (uid, 'PLA', 'PLA', 110, 1000),
         (uid, 'ABS', 'ABS', 90, 1000);

  insert into public.insumos (user_id, nome, unidade, preco_pago, qtd_embalagem)
  values (uid, 'Tinta (frasco)', 'ml', 6, null);

  return true;
end;
$$;

revoke execute on function public.criar_dados_iniciais() from public, anon;
grant execute on function public.criar_dados_iniciais() to authenticated;
