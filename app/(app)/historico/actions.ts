"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { STATUS_ORCAMENTO } from "@/lib/dominio";
import { checkbox, decimalOpcional, lerFormulario, mensagemErroBanco, textoOpcional, type EstadoAcao } from "@/lib/form";
import { requireUser } from "@/lib/supabase/server";

const idSchema = z.uuid();

function concluir(resposta: { data: { id: string }[] | null; error: { code?: string; message: string } | null }, mensagem: string): EstadoAcao {
  if (resposta.error) return { erro: mensagemErroBanco(resposta.error) };
  if (!resposta.data?.length) return { erro: "Orçamento não encontrado. Recarregue a página." };
  revalidatePath("/historico");
  revalidatePath("/clientes");
  return { ok: true, mensagem };
}

// "entregue" passa pelo registro da entrega, que pede os dados reais.
const statusSemEntrega = z.enum(STATUS_ORCAMENTO).exclude(["entregue"]);

export async function alterarStatus(id: string, status: string): Promise<EstadoAcao> {
  const { supabase } = await requireUser();
  const s = statusSemEntrega.safeParse(status);
  if (!idSchema.safeParse(id).success || !s.success) return { erro: "Status inválido" };
  const r = await supabase.from("orcamentos").update({ status: s.data }).eq("id", id).select("id");
  return concluir(r, "Status atualizado");
}

const entregaSchema = z.object({
  horas_reais: decimalOpcional({ min: 0, max: 100_000, casas: 4 }),
  gramas_reais: decimalOpcional({ min: 0, max: 1_000_000, casas: 2 }),
  houve_falha: checkbox,
  observacao_entrega: textoOpcional(500),
});

export async function registrarEntrega(id: string, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const { supabase } = await requireUser();
  if (!idSchema.safeParse(id).success) return { erro: "Orçamento inválido" };
  const { dados, erro } = lerFormulario(entregaSchema, fd);
  if (erro) return erro;
  const r = await supabase
    .from("orcamentos")
    .update({ ...dados, status: "entregue" })
    .eq("id", id)
    .select("id");
  return concluir(r, "Entrega registrada");
}

export async function excluirOrcamento(id: string): Promise<EstadoAcao> {
  const { supabase } = await requireUser();
  if (!idSchema.safeParse(id).success) return { erro: "Orçamento inválido" };
  const r = await supabase.from("orcamentos").delete().eq("id", id).select("id");
  return concluir(r, "Orçamento excluído");
}
