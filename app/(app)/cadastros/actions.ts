"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { filamentoSchema, impressoraSchema, insumoSchema } from "@/lib/cadastros";
import { TABELAS_CADASTRO, type TabelaCadastro } from "@/lib/dominio";
import { lerFormulario, mensagemErroBanco, type EstadoAcao } from "@/lib/form";
import { requireUser } from "@/lib/supabase/server";

const idSchema = z.uuid();

type Resposta = { data: { id: string }[] | null; error: { code?: string; message: string } | null };

/** Trata erro do banco e o caso em que o RLS filtrou a linha (0 linhas afetadas). */
async function concluir(operacao: PromiseLike<Resposta>, mensagem: string): Promise<EstadoAcao> {
  const { data, error } = await operacao;
  if (error) return { erro: mensagemErroBanco(error) };
  if (!data?.length) return { erro: "Registro não encontrado. Recarregue a página." };
  revalidatePath("/cadastros");
  return { ok: true, mensagem };
}

const idValido = (id: string | null) => id === null || idSchema.safeParse(id).success;

// ---------- Salvar (criar ou editar) ----------

export async function salvarFilamento(id: string | null, _e: EstadoAcao, fd: FormData) {
  const { supabase } = await requireUser();
  if (!idValido(id)) return { erro: "Registro inválido" };
  const { dados, erro } = lerFormulario(filamentoSchema, fd);
  if (erro) return erro;
  const tabela = supabase.from("filamentos");
  return concluir(
    (id ? tabela.update(dados).eq("id", id) : tabela.insert(dados)).select("id"),
    id ? "Filamento atualizado" : "Filamento cadastrado",
  );
}

export async function salvarImpressora(id: string | null, _e: EstadoAcao, fd: FormData) {
  const { supabase } = await requireUser();
  if (!idValido(id)) return { erro: "Registro inválido" };
  const { dados, erro } = lerFormulario(impressoraSchema, fd);
  if (erro) return erro;
  const tabela = supabase.from("impressoras");
  return concluir(
    (id ? tabela.update(dados).eq("id", id) : tabela.insert(dados)).select("id"),
    id ? "Impressora atualizada" : "Impressora cadastrada",
  );
}

export async function salvarInsumo(id: string | null, _e: EstadoAcao, fd: FormData) {
  const { supabase } = await requireUser();
  if (!idValido(id)) return { erro: "Registro inválido" };
  const { dados, erro } = lerFormulario(insumoSchema, fd);
  if (erro) return erro;
  const tabela = supabase.from("insumos");
  return concluir(
    (id ? tabela.update(dados).eq("id", id) : tabela.insert(dados)).select("id"),
    id ? "Insumo atualizado" : "Insumo cadastrado",
  );
}

// ---------- Excluir: itens usados em orçamentos são desativados, não apagados ----------

const tabelaSchema = z.enum(TABELAS_CADASTRO);
const MSG_DESATIVADO = "Usado em orçamentos: foi desativado em vez de excluído";

export async function excluirCadastro(tabela: TabelaCadastro, id: string): Promise<EstadoAcao> {
  const { supabase } = await requireUser();
  const t = tabelaSchema.safeParse(tabela);
  if (!t.success || !idSchema.safeParse(id).success) return { erro: "Registro inválido" };
  const desativar = () => concluir(supabase.from(t.data).update({ ativo: false }).eq("id", id).select("id"), MSG_DESATIVADO);

  // Insumos: a FK das linhas de orçamento é "set null", então o banco não impede; conferimos o uso antes.
  if (t.data === "insumos") {
    const { count, error } = await supabase
      .from("orcamento_insumos")
      .select("id", { count: "exact", head: true })
      .eq("insumo_id", id);
    if (error) return { erro: mensagemErroBanco(error) };
    if (count) return desativar();
  }

  // Filamentos e impressoras: a FK é "restrict"; o próprio delete falha (23503) se houver orçamento.
  const { data, error } = await supabase.from(t.data).delete().eq("id", id).select("id");
  if (error?.code === "23503") return desativar();
  return concluir(Promise.resolve({ data, error }), "Excluído");
}
