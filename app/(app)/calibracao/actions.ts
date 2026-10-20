"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mensagemErroBanco, type EstadoAcao } from "@/lib/form";
import { requireUser } from "@/lib/supabase/server";

const ajusteSchema = z.object({
  campo: z.enum(["taxa_falha_pct", "desperdicio_pct"]),
  valor: z.number().finite().min(0).max(100),
});

/** Aplica uma sugestão do relatório nas configurações (só taxa de falha ou desperdício). */
export async function aplicarSugestao(campo: string, valor: number): Promise<EstadoAcao> {
  const { supabase, userId } = await requireUser();
  const a = ajusteSchema.safeParse({ campo, valor });
  if (!a.success) return { erro: "Sugestão inválida" };

  const atualizacao = a.data.campo === "taxa_falha_pct" ? { taxa_falha_pct: a.data.valor } : { desperdicio_pct: a.data.valor };
  const { data, error } = await supabase.from("configuracoes").update(atualizacao).eq("user_id", userId).select("id");
  if (error) return { erro: mensagemErroBanco(error) };
  if (!data.length) return { erro: "Configurações não encontradas" };

  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Aplicado nas configurações. Vale para os próximos orçamentos." };
}
