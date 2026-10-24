-- Fase 7: "Atualizar" um orçamento enviado reinicia o prazo do follow-up (ele foi reenviado ao cliente),
-- e configuracoes fica só com os privilégios que o app usa.

create or replace function public.salvar_orcamento(p_id uuid, p_dados jsonb, p_insumos jsonb)
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
              from jsonb_populate_record(null::public.orcamentos, p_dados) r),
           status_alterado_em = case when o.status = 'enviado' then now() else o.status_alterado_em end
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

-- Os grants padrão do Supabase dão também truncate, references e trigger. O app só lê e altera parâmetros.
revoke all on public.configuracoes from anon, authenticated;
grant select on public.configuracoes to authenticated;
grant update (
  tarifa_kwh, desperdicio_pct, taxa_falha_pct, valor_hora, preparo_min, acabamento_min_peca,
  embalagem_pedido, margem_pct, taxa_pagamento_pct, pedido_minimo, retorno_ativo, retorno_meses,
  retorno_horas_mes, validade_orcamento_dias, followup_dias, pintura_insumos_peca, pintura_min_peca
) on public.configuracoes to authenticated;
