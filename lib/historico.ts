import "server-only";
import type { StatusOrcamento } from "@/lib/dominio";
import type { createClient } from "@/lib/supabase/server";

export type ItemHistorico = {
  id: string;
  criadoEm: string;
  peca: string;
  material: string;
  quantidade: number;
  pintado: boolean;
  preco: number;
  lucro: number;
  status: StatusOrcamento;
  statusAlteradoEm: string;
  horasEstimadas: number | null;
  gramasEstimadas: number | null;
  horasReais: number | null;
  gramasReais: number | null;
  houveFalha: boolean | null;
  observacao: string | null;
  clienteId: string | null;
  clienteNome: string | null;
  clienteTelefone: string | null;
};

export const LIMITE_HISTORICO = 500;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Orçamentos mais recentes (opcionalmente de um cliente), no formato da lista do histórico. */
export async function carregarHistorico(supabase: Supabase, clienteId?: string) {
  let consulta = supabase
    .from("orcamentos")
    .select(
      "id, created_at, peca, material, quantidade, pintado, preco, lucro, status, status_alterado_em, horas_reais, gramas_reais, houve_falha, observacao_entrega, detalhamento, cliente_id, clientes(nome, telefone)",
    )
    .order("created_at", { ascending: false })
    .limit(LIMITE_HISTORICO);
  if (clienteId) consulta = consulta.eq("cliente_id", clienteId);

  const { data, error } = await consulta;
  const itens: ItemHistorico[] = (data ?? []).map((o) => {
    const d = o.detalhamento as { horas?: number; gramas?: number } | null;
    return {
      id: o.id,
      criadoEm: o.created_at,
      peca: o.peca,
      material: o.material,
      quantidade: o.quantidade,
      pintado: o.pintado,
      preco: o.preco,
      lucro: o.lucro,
      status: o.status,
      statusAlteradoEm: o.status_alterado_em,
      horasEstimadas: d?.horas ?? null,
      gramasEstimadas: d?.gramas ?? null,
      horasReais: o.horas_reais,
      gramasReais: o.gramas_reais,
      houveFalha: o.houve_falha,
      observacao: o.observacao_entrega,
      clienteId: o.cliente_id,
      clienteNome: o.clientes?.nome ?? null,
      clienteTelefone: o.clientes?.telefone ?? null,
    };
  });
  return { itens, erro: Boolean(error), truncado: itens.length >= LIMITE_HISTORICO };
}
