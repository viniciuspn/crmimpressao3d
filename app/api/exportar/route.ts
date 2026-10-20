import { ABAS_EXPORTACAO, gerarPlanilha, type TabelaExportada } from "@/lib/exportar";
import { todasAsPaginas } from "@/lib/paginar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Backup .xlsx com uma aba por tabela. Lê como o usuário logado (RLS). */
export async function GET() {
  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) return new Response("Não autenticado", { status: 401 });

  const resultados = await Promise.all(
    ABAS_EXPORTACAO.map(({ tabela }) =>
      todasAsPaginas<Record<string, unknown>>((de, ate) =>
        supabase.from(tabela).select("*").order("created_at").order("id").range(de, ate),
      ),
    ),
  );
  if (resultados.some((r) => r.erro)) return new Response("Não foi possível gerar o backup", { status: 500 });

  const dados = Object.fromEntries(ABAS_EXPORTACAO.map(({ tabela }, i) => [tabela, resultados[i].dados])) as Record<
    TabelaExportada,
    Record<string, unknown>[]
  >;

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
