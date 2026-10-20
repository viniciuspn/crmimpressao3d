import { ABAS_EXPORTACAO, gerarPlanilha, type TabelaExportada } from "@/lib/exportar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// O PostgREST devolve no máximo 1000 linhas por consulta; o backup busca em páginas.
const PAGINA = 1000;

/** Backup .xlsx com uma aba por tabela. Lê como o usuário logado (RLS). */
export async function GET() {
  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) return new Response("Não autenticado", { status: 401 });

  const dados = {} as Record<TabelaExportada, Record<string, unknown>[]>;
  for (const { tabela } of ABAS_EXPORTACAO) {
    const linhas: Record<string, unknown>[] = [];
    for (let inicio = 0; ; inicio += PAGINA) {
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .order("created_at")
        .order("id")
        .range(inicio, inicio + PAGINA - 1);
      if (error) return new Response("Não foi possível gerar o backup", { status: 500 });
      linhas.push(...data);
      if (data.length < PAGINA) break;
    }
    dados[tabela] = linhas;
  }

  const agora = new Date();
  const dia = agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
  const arquivo = await gerarPlanilha(dados, agora);

  return new Response(new Uint8Array(arquivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ideia-backup-${dia}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
