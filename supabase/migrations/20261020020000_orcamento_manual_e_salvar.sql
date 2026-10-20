-- Fase 5: orçamento com impressora "Manual" e filamento "genérico" (como no protótipo),
-- nomes congelados para listar, e gravação atômica do orçamento com as linhas de insumo.

-- FK composta com uma coluna nula não é verificada (MATCH SIMPLE): sem cadastro, sem vínculo.
alter table public.orcamentos alter column filamento_id drop not null;
alter table public.orcamentos alter column impressora_id drop not null;

alter table public.orcamentos
  add column material text not null default '' check (length(material) <= 200),
  add column impressora_nome text not null default '' check (length(impressora_nome) <= 200);

-- Grava (insert ou update) o orçamento e substitui as linhas de insumo numa só transação.
-- security invoker: RLS e FKs compostas valem como em qualquer gravação do usuário.
create function public.salvar_orcamento(p_id uuid, p_dados jsonb, p_insumos jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into public.orcamentos (
      cliente_id, filamento_id, impressora_id, material, impressora_nome, peca, quantidade,
      pecas_por_mesa, gramas_por_mesa, horas_por_mesa, pintado, parametros, custo_total, preco,
      lucro, detalhamento
    )
    select
      r.cliente_id, r.filamento_id, r.impressora_id, r.material, r.impressora_nome, r.peca, r.quantidade,
      r.pecas_por_mesa, r.gramas_por_mesa, r.horas_por_mesa, coalesce(r.pintado, false), r.parametros,
      r.custo_total, r.preco, r.lucro, r.detalhamento
    from jsonb_populate_record(null::public.orcamentos, p_dados) r
    returning id into v_id;
  else
    update public.orcamentos o
       set (cliente_id, filamento_id, impressora_id, material, impressora_nome, peca, quantidade,
            pecas_por_mesa, gramas_por_mesa, horas_por_mesa, pintado, parametros, custo_total, preco,
            lucro, detalhamento) =
           (select r.cliente_id, r.filamento_id, r.impressora_id, r.material, r.impressora_nome, r.peca,
                   r.quantidade, r.pecas_por_mesa, r.gramas_por_mesa, r.horas_por_mesa,
                   coalesce(r.pintado, false), r.parametros, r.custo_total, r.preco, r.lucro, r.detalhamento
              from jsonb_populate_record(null::public.orcamentos, p_dados) r)
     where o.id = p_id
    returning o.id into v_id;

    if v_id is null then
      raise exception 'orçamento não encontrado' using errcode = 'P0002';
    end if;

    delete from public.orcamento_insumos where orcamento_id = v_id;
  end if;

  insert into public.orcamento_insumos (
    orcamento_id, insumo_id, nome_snapshot, unidade, custo_unitario_snapshot, quantidade, base
  )
  select v_id, r.insumo_id, r.nome_snapshot, r.unidade, r.custo_unitario_snapshot, r.quantidade, r.base
  from jsonb_populate_recordset(null::public.orcamento_insumos, coalesce(p_insumos, '[]'::jsonb)) r;

  return v_id;
end;
$$;

revoke execute on function public.salvar_orcamento(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.salvar_orcamento(uuid, jsonb, jsonb) to authenticated;
