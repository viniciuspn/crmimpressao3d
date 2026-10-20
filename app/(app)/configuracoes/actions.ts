"use server";

import { revalidatePath } from "next/cache";
import { configuracoesSchema } from "@/lib/cadastros";
import { lerFormulario, mensagemErroBanco, type EstadoAcao } from "@/lib/form";
import { requireUser } from "@/lib/supabase/server";

export async function salvarConfiguracoes(_e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const { supabase, userId } = await requireUser();
  const { dados, erro } = lerFormulario(configuracoesSchema, fd);
  if (erro) return erro;

  const { data, error } = await supabase.from("configuracoes").update(dados).eq("user_id", userId).select("id");
  if (error) return { erro: mensagemErroBanco(error) };
  if (!data.length) return { erro: "Configurações não encontradas. Saia e entre de novo." };

  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Configurações salvas" };
}
