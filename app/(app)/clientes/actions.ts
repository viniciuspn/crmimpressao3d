"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteSchema } from "@/lib/cadastros";
import { lerFormulario, mensagemErroBanco, type EstadoAcao } from "@/lib/form";
import { requireUser } from "@/lib/supabase/server";

const idSchema = z.uuid();

function revalidar() {
  revalidatePath("/clientes", "layout");
  revalidatePath("/historico");
  revalidatePath("/");
}

export async function salvarCliente(id: string | null, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const { supabase } = await requireUser();
  if (id !== null && !idSchema.safeParse(id).success) return { erro: "Cliente inválido" };
  const { dados, erro } = lerFormulario(clienteSchema, fd);
  if (erro) return erro;

  const tabela = supabase.from("clientes");
  const { data, error } = await (id ? tabela.update(dados).eq("id", id) : tabela.insert(dados)).select("id");
  if (error) return { erro: mensagemErroBanco(error) };
  if (!data.length) return { erro: "Cliente não encontrado. Recarregue a página." };
  revalidar();
  return { ok: true, mensagem: id ? "Cliente atualizado" : "Cliente cadastrado" };
}

/** Os orçamentos do cliente continuam no histórico, sem cliente (FK on delete set null). */
export async function excluirCliente(id: string): Promise<EstadoAcao> {
  const { supabase } = await requireUser();
  if (!idSchema.safeParse(id).success) return { erro: "Cliente inválido" };
  const { data, error } = await supabase.from("clientes").delete().eq("id", id).select("id");
  if (error) return { erro: mensagemErroBanco(error) };
  if (!data.length) return { erro: "Cliente não encontrado. Recarregue a página." };
  revalidar();
  return { ok: true, mensagem: "Cliente excluído; os orçamentos dele ficaram sem cliente" };
}
