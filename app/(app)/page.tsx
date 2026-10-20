import { z } from "zod";
import { entradaOrcamentoSchema } from "@/lib/orcamento";
import { requireUser } from "@/lib/supabase/server";
import { EditorOrcamento, type Config, type InsumoOpcao, type OrcamentoAberto } from "./editor-orcamento";

const parametrosSchema = z.object({
  entrada: entradaOrcamentoSchema,
  material: z.string().optional(),
  impressora_nome: z.string().optional(),
});

export default async function OrcamentoPage({ searchParams }: PageProps<"/">) {
  const { id: idParam, novo, salvo, cliente } = await searchParams;
  const id = typeof idParam === "string" && z.uuid().safeParse(idParam).success ? idParam : null;
  const idInvalido = idParam !== undefined && id === null;
  const { supabase } = await requireUser();

  const [config, filamentos, impressoras, insumos, clientes, aberto] = await Promise.all([
    supabase
      .from("configuracoes")
      .select(
        "tarifa_kwh, desperdicio_pct, taxa_falha_pct, valor_hora, preparo_min, acabamento_min_peca, embalagem_pedido, margem_pct, taxa_pagamento_pct, pedido_minimo, retorno_ativo, retorno_meses, retorno_horas_mes, validade_orcamento_dias, pintura_insumos_peca, pintura_min_peca",
      )
      .maybeSingle(),
    supabase.from("filamentos").select("id, nome, tipo, preco_rolo, frete, peso_rolo_g").eq("ativo", true).order("nome"),
    supabase.from("impressoras").select("id, nome, preco, vida_util_h, consumo_w, manutencao_h").eq("ativo", true).order("nome"),
    supabase
      .from("insumos")
      .select("id, nome, unidade, preco_pago, qtd_embalagem")
      .eq("ativo", true)
      .not("qtd_embalagem", "is", null)
      .order("nome"),
    supabase.from("clientes").select("id, nome").order("nome"),
    id
      ? supabase.from("orcamentos").select("id, parametros, created_at, cliente_id, clientes(nome)").eq("id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!config.data) {
    return (
      <p className="rounded-md border-l-4 border-warn bg-soft p-4 text-sm">
        Suas configurações ainda não foram criadas. Saia e entre de novo para criá-las.
      </p>
    );
  }

  let orcamento: OrcamentoAberto | null = null;
  let erroAbrir: string | null = idInvalido ? "Orçamento não encontrado." : null;
  if (id) {
    const o = aberto.data;
    const p = o ? parametrosSchema.safeParse(o.parametros) : null;
    if (o && p?.success) {
      // A entrada congelada pode citar cadastros que sumiram depois: vale o estado atual do banco
      // (cliente apagado → sem cliente; insumo apagado → linha mantida, sem vínculo).
      const idsInsumos = p.data.entrada.insumos.flatMap((l) => (l.insumo_id ? [l.insumo_id] : []));
      const existentes = idsInsumos.length
        ? new Set((await supabase.from("insumos").select("id").in("id", idsInsumos)).data?.map((i) => i.id))
        : new Set<string>();
      const entrada = {
        ...p.data.entrada,
        cliente_id: o.cliente_id,
        insumos: p.data.entrada.insumos.map((l) => (l.insumo_id && !existentes.has(l.insumo_id) ? { ...l, insumo_id: null } : l)),
      };
      orcamento = {
        id: o.id,
        entrada,
        material: p.data.material ?? "",
        impressoraNome: p.data.impressora_nome ?? "",
        criadoEm: o.created_at,
        cliente: o.clientes?.nome ?? null,
      };
    } else {
      erroAbrir = o ? "Este orçamento foi salvo num formato antigo e não pode ser aberto." : "Orçamento não encontrado.";
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{orcamento ? "Editar orçamento" : "Orçamento"}</h1>
        <p className="text-sm text-muted">Escolha a impressora e o filamento; os campos se ajustam e o preço aparece ao lado.</p>
      </div>
      {erroAbrir && <p className="rounded-md border-l-4 border-warn bg-soft p-3 text-sm">{erroAbrir}</p>}
      <EditorOrcamento
        key={orcamento?.id ?? String(novo ?? "novo")}
        config={config.data as Config}
        filamentos={filamentos.data ?? []}
        impressoras={impressoras.data ?? []}
        insumos={(insumos.data ?? []) as InsumoOpcao[]}
        clientes={clientes.data ?? []}
        orcamento={orcamento}
        mensagemInicial={salvo === "1" && orcamento ? "Orçamento salvo no histórico" : null}
        clienteInicial={typeof cliente === "string" ? cliente : undefined}
      />
    </section>
  );
}
