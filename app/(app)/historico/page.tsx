import { requireUser } from "@/lib/supabase/server";
import { ListaHistorico, type ItemHistorico } from "./lista-historico";

export default async function HistoricoPage({ searchParams }: PageProps<"/historico">) {
  const { cliente } = await searchParams;
  const { supabase } = await requireUser();

  const [orcamentos, clientes, config] = await Promise.all([
    supabase
      .from("orcamentos")
      .select(
        "id, created_at, peca, material, quantidade, pintado, preco, lucro, status, status_alterado_em, horas_por_mesa, gramas_por_mesa, horas_reais, gramas_reais, houve_falha, observacao_entrega, detalhamento, cliente_id, clientes(nome, telefone)",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("configuracoes").select("followup_dias").maybeSingle(),
  ]);

  const itens: ItemHistorico[] = (orcamentos.data ?? []).map((o) => {
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

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Histórico</h1>
      {orcamentos.error && <p className="text-sm text-danger">Não foi possível carregar os orçamentos.</p>}
      <ListaHistorico
        itens={itens}
        clientes={clientes.data ?? []}
        followupDias={config.data?.followup_dias ?? 7}
        clienteInicial={typeof cliente === "string" ? cliente : ""}
      />
    </section>
  );
}
