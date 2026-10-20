"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { arredondar2, calcular } from "@/lib/calculo";
import { mensagemErroBanco } from "@/lib/form";
import { entradaOrcamentoSchema, paraEntradaCalculo, rotuloMaterial } from "@/lib/orcamento";
import { requireUser } from "@/lib/supabase/server";

export type ResultadoSalvar = { ok: true; id: string; mensagem: string } | { ok: false; erro: string };

/** Salva (cria ou atualiza) um orçamento. O preço é sempre recalculado aqui, a partir das entradas. */
export async function salvarOrcamento(id: string | null, entrada: unknown): Promise<ResultadoSalvar> {
  const { supabase } = await requireUser();
  if (id !== null && !z.uuid().safeParse(id).success) return { ok: false, erro: "Orçamento inválido" };

  const parsed = entradaOrcamentoSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Confira os campos" };
  const e = parsed.data;

  // Nomes congelados para a lista e o texto (o RLS garante que os cadastros são do usuário).
  let material: string;
  let filamentoId: string | null = null;
  if (e.filamento.tipo === "cadastro") {
    const { data: f } = await supabase.from("filamentos").select("id, nome, tipo").eq("id", e.filamento.id).maybeSingle();
    if (!f) return { ok: false, erro: "Filamento não encontrado" };
    material = rotuloMaterial(f);
    filamentoId = f.id;
  } else {
    material = e.filamento.nome;
  }

  let impressoraNome = "Manual";
  if (e.impressora_id) {
    const { data: imp } = await supabase.from("impressoras").select("nome").eq("id", e.impressora_id).maybeSingle();
    if (!imp) return { ok: false, erro: "Impressora não encontrada" };
    impressoraNome = imp.nome;
  }

  let r;
  try {
    r = calcular(paraEntradaCalculo(e));
  } catch {
    return { ok: false, erro: "Algum valor do orçamento está fora do permitido" };
  }

  const dados = {
    cliente_id: e.cliente_id,
    filamento_id: filamentoId,
    impressora_id: e.impressora_id,
    material,
    impressora_nome: impressoraNome,
    peca: e.peca,
    quantidade: e.quantidade,
    pecas_por_mesa: e.pecas_por_mesa,
    gramas_por_mesa: arredondar2(e.gramas_por_mesa),
    horas_por_mesa: e.horas_por_mesa,
    pintado: e.pintado,
    // Fonte para recalcular ao reabrir: todas as entradas em precisão total.
    parametros: { versao: 1, entrada: e, material, impressora_nome: impressoraNome },
    custo_total: arredondar2(r.custo_total),
    preco: arredondar2(r.preco),
    lucro: arredondar2(r.lucro),
    detalhamento: {
      componentes: r.componentes,
      pintura_insumos: r.pintura_insumos,
      pintura_mao_de_obra: r.pintura_mao_de_obra,
      mesas: r.mesas,
      gramas: r.gramas,
      horas: r.horas,
      retorno: r.retorno,
      margem_real: r.margem_real,
      horas_trabalhadas: r.horas_trabalhadas,
      valor_hora_real: r.valor_hora_real,
      avisos: r.avisos,
    },
  };

  const insumos = e.insumos.map((l) => ({
    insumo_id: l.insumo_id,
    nome_snapshot: l.nome,
    unidade: l.unidade,
    custo_unitario_snapshot: l.custo_unitario,
    quantidade: l.quantidade,
    base: l.base,
  }));

  const { data: novoId, error } = await supabase.rpc("salvar_orcamento", {
    // null explícito (orçamento novo): sem a chave, o PostgREST não encontra a função.
    // O tipo gerado não aceita null porque o parâmetro SQL não tem default.
    p_id: id as string,
    p_dados: dados,
    p_insumos: insumos,
  });
  if (error) {
    if (error.code === "P0002") return { ok: false, erro: "Orçamento não encontrado. Ele pode ter sido excluído." };
    return { ok: false, erro: mensagemErroBanco(error) };
  }

  revalidatePath("/historico");
  revalidatePath("/clientes", "layout");
  return { ok: true, id: novoId, mensagem: id ? "Orçamento atualizado" : "Orçamento salvo no histórico" };
}
