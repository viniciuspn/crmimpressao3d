import Link from "next/link";
import { Kpi } from "@/components/kpi";
import { AMOSTRA_MINIMA, calibrar, PESO_TAXA_ATUAL, type Entrega } from "@/lib/calibracao";
import { formatarNumero } from "@/lib/formato";
import { requireUser } from "@/lib/supabase/server";
import { aplicarSugestao } from "./actions";
import { BotaoAplicar } from "./botao-aplicar";

type Parametros = { entrada?: { desperdicio_pct?: number } } | null;
type Detalhamento = { horas?: number; gramas?: number } | null;

const desvio = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${formatarNumero(v * 100, 1)}%`);
const pct = (v: number | null) => (v === null ? "—" : `${formatarNumero(v * 100, 1)}%`);

export default async function CalibracaoPage() {
  const { supabase } = await requireUser();
  const [entregues, config] = await Promise.all([
    supabase
      .from("orcamentos")
      .select("id, peca, status_alterado_em, horas_reais, gramas_reais, houve_falha, detalhamento, parametros, clientes(nome)")
      .eq("status", "entregue")
      .order("status_alterado_em", { ascending: false }),
    supabase.from("configuracoes").select("taxa_falha_pct, desperdicio_pct").maybeSingle(),
  ]);

  const taxaAtual = config.data?.taxa_falha_pct ?? 0;
  const desperdicioAtual = config.data?.desperdicio_pct ?? 0;
  const linhas = (entregues.data ?? []).map((o) => {
    const d = o.detalhamento as Detalhamento;
    const p = o.parametros as Parametros;
    const e: Entrega = {
      horasEstimadas: d?.horas ?? null,
      horasReais: o.horas_reais,
      gramasEstimadas: d?.gramas ?? null,
      gramasReais: o.gramas_reais,
      houveFalha: o.houve_falha,
      desperdicioUsado: p?.entrada?.desperdicio_pct ?? null,
    };
    return { id: o.id, peca: o.peca, cliente: o.clientes?.nome ?? null, data: o.status_alterado_em, ...e };
  });
  const r = calibrar(linhas, taxaAtual, desperdicioAtual);

  return (
    <section className="space-y-5">
      <div>
        <Link href="/historico" className="text-sm text-accent">
          ← Histórico
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Relatório de calibração</h1>
        <p className="text-sm text-muted">
          Compara o que você estimou com o que realmente aconteceu nos orçamentos entregues. Registre as horas, as gramas e as falhas
          ao marcar &quot;Entregue&quot; no histórico.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi rotulo="Entregues" valor={String(r.entregas)} />
        <Kpi rotulo="Desvio de horas" valor={desvio(r.desvioHoras)} />
        <Kpi rotulo="Desvio de gramas" valor={desvio(r.desvioGramas)} />
        <Kpi rotulo="Falha real" valor={r.taxaFalhaReal === null ? "—" : `${pct(r.taxaFalhaReal)} (${r.falhas}/${r.comFalha})`} />
      </div>

      <div className="space-y-3 rounded-md border border-line bg-panel p-4">
        <h2 className="font-semibold">Sugestões</h2>
        {r.comFalha < AMOSTRA_MINIMA && r.comGramas < AMOSTRA_MINIMA ? (
          <p className="text-sm text-muted">
            Registre pelo menos {AMOSTRA_MINIMA} entregas com dados reais para receber sugestões (hoje: {Math.max(r.comFalha, r.comGramas)}).
          </p>
        ) : (
          <>
            {r.taxaFalhaSugerida !== null ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Taxa de falha: hoje <b className="font-mono">{formatarNumero(taxaAtual, 1)}%</b>, sugerido{" "}
                  <b className="font-mono">{formatarNumero(r.taxaFalhaSugerida, 1)}%</b>.
                </p>
                <p className="text-xs text-muted">
                  Mistura a falha real ({r.falhas} em {r.comFalha}) com a taxa atual, que conta como {PESO_TAXA_ATUAL} trabalhos. Assim,
                  poucos casos não mudam tudo de uma vez.
                </p>
                <BotaoAplicar
                  acao={aplicarSugestao.bind(null, "taxa_falha_pct", r.taxaFalhaSugerida)}
                  rotulo={`Usar ${formatarNumero(r.taxaFalhaSugerida, 1)}% de taxa de falha`}
                />
              </div>
            ) : (
              r.comFalha >= AMOSTRA_MINIMA && <p className="text-sm">Sua taxa de falha ({formatarNumero(taxaAtual, 1)}%) está de acordo com o real.</p>
            )}
            {r.desperdicioSugerido !== null && (
              <div className="space-y-2 border-t border-line pt-3">
                <p className="text-sm">
                  Desperdício de filamento: hoje <b className="font-mono">{formatarNumero(desperdicioAtual, 1)}%</b>, sugerido{" "}
                  <b className="font-mono">{formatarNumero(r.desperdicioSugerido, 1)}%</b> (o que teria acertado as gramas reais).
                </p>
                <BotaoAplicar
                  acao={aplicarSugestao.bind(null, "desperdicio_pct", r.desperdicioSugerido)}
                  rotulo={`Usar ${formatarNumero(r.desperdicioSugerido, 1)}% de desperdício`}
                />
              </div>
            )}
            {r.desvioHoras !== null && Math.abs(r.desvioHoras) >= 0.05 && (
              <p className="border-t border-line pt-3 text-sm">
                Suas impressões levam em média {desvio(r.desvioHoras)} do tempo do fatiador. Ao orçar, considere ajustar o &quot;Tempo por
                mesa&quot; nessa proporção.
              </p>
            )}
          </>
        )}
      </div>

      {linhas.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-line bg-panel">
          <table className="w-full min-w-[560px] text-sm tabular-nums">
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-[.08em] text-muted uppercase">
                <th className="px-3 py-2 font-semibold">Entrega</th>
                <th className="px-3 py-2 text-right font-semibold">Horas est. → real</th>
                <th className="px-3 py-2 text-right font-semibold">Gramas est. → real</th>
                <th className="px-3 py-2 font-semibold">Falha</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-b border-dashed border-line last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/?id=${l.id}`} className="font-medium hover:underline">
                      {l.peca}
                    </Link>
                    <span className="block text-xs text-muted">
                      {[l.cliente, new Date(l.data).toLocaleDateString("pt-BR")].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {l.horasEstimadas !== null ? formatarNumero(l.horasEstimadas) : "—"} → {l.horasReais !== null ? formatarNumero(l.horasReais) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {l.gramasEstimadas !== null ? formatarNumero(l.gramasEstimadas, 0) : "—"} → {l.gramasReais !== null ? formatarNumero(l.gramasReais, 0) : "—"}
                  </td>
                  <td className="px-3 py-2">{l.houveFalha === null ? "—" : l.houveFalha ? "sim" : "não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
