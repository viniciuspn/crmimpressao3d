import Link from "next/link";
import { Kpi } from "@/components/kpi";
import { AMOSTRA_MINIMA, calibrar, PESO_TAXA_USADA, type Entrega } from "@/lib/calibracao";
import { formatarNumero } from "@/lib/formato";
import { todasAsPaginas } from "@/lib/paginar";
import { requireUser } from "@/lib/supabase/server";
import { aplicarSugestao } from "./actions";
import { BotaoAplicar } from "./botao-aplicar";

type Parametros = { entrada?: { desperdicio_pct?: number; taxa_falha_pct?: number } } | null;
type Detalhamento = { horas?: number; gramas?: number; mesas?: number } | null;

const desvio = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${formatarNumero(v * 100, 1)}%`);
const pct = (v: number) => `${formatarNumero(v, 1)}%`;

export default async function CalibracaoPage() {
  const { supabase } = await requireUser();
  const [entregues, config] = await Promise.all([
    todasAsPaginas((de, ate) =>
      supabase
        .from("orcamentos")
        .select("id, peca, status_alterado_em, horas_reais, gramas_reais, houve_falha, detalhamento, parametros, clientes(nome)")
        .eq("status", "entregue")
        .order("status_alterado_em", { ascending: false })
        .order("id")
        .range(de, ate),
    ),
    supabase.from("configuracoes").select("taxa_falha_pct, desperdicio_pct").maybeSingle(),
  ]);

  const taxaAtual = config.data?.taxa_falha_pct ?? 0;
  const desperdicioAtual = config.data?.desperdicio_pct ?? 0;
  const linhas = entregues.dados.map((o) => {
    const d = o.detalhamento as Detalhamento;
    const p = o.parametros as Parametros;
    const e: Entrega = {
      horasEstimadas: d?.horas ?? null,
      horasReais: o.horas_reais,
      gramasEstimadas: d?.gramas ?? null,
      gramasReais: o.gramas_reais,
      houveFalha: o.houve_falha,
      mesas: d?.mesas ?? null,
      desperdicioUsado: p?.entrada?.desperdicio_pct ?? null,
      taxaFalhaUsada: p?.entrada?.taxa_falha_pct ?? null,
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

      {(entregues.erro || config.error) && (
        <p className="rounded-md border-l-4 border-danger bg-soft p-3 text-sm">Não foi possível carregar tudo. Recarregue a página.</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi rotulo="Entregues" valor={String(r.entregas)} />
        <Kpi rotulo="Desvio de horas" valor={desvio(r.desvioHoras)} />
        <Kpi rotulo="Desvio de gramas" valor={desvio(r.desvioGramas)} />
        <Kpi
          rotulo="Falha real"
          valor={r.taxaFalhaReal === null ? "—" : `${pct(r.taxaFalhaReal * 100)} (${r.falhas}/${r.mesas} mesas)`}
        />
      </div>
      <p className="text-xs text-muted">
        Desvios e desperdício usam só entregas sem falha (a reimpressão já é coberta pela taxa de falha), ponderados pelo tamanho de
        cada trabalho. A falha real conta uma mesa perdida por falha.
      </p>

      <div className="space-y-3 rounded-md border border-line bg-panel p-4">
        <h2 className="font-semibold">Sugestões</h2>

        {r.taxaFalhaCalculada === null ? (
          <p className="text-sm text-muted">
            Taxa de falha: registre pelo menos {AMOSTRA_MINIMA} entregas com horas ou gramas reais (hoje: {r.comFalha}).
          </p>
        ) : r.taxaFalhaSugerida !== null ? (
          <div className="space-y-2">
            <p className="text-sm">
              Taxa de falha: hoje <b className="font-mono">{pct(taxaAtual)}</b>, sugerido{" "}
              <b className="font-mono">{pct(r.taxaFalhaSugerida)}</b>.
            </p>
            <p className="text-xs text-muted">
              Mistura a falha real ({r.falhas} em {r.mesas} mesas) com a taxa usada nos orçamentos ({pct(r.taxaBase)}), que conta como{" "}
              {PESO_TAXA_USADA} mesas. Assim, poucos casos não mudam tudo de uma vez.
            </p>
            <BotaoAplicar
              key={`falha-${r.taxaFalhaSugerida}`}
              acao={aplicarSugestao.bind(null, "taxa_falha_pct", r.taxaFalhaSugerida)}
              rotulo={`Usar ${pct(r.taxaFalhaSugerida)} de taxa de falha`}
            />
          </div>
        ) : (
          <p className="text-sm">Taxa de falha ({pct(taxaAtual)}) de acordo com o real.</p>
        )}

        <div className="border-t border-line pt-3">
          {r.desperdicioCalculado === null ? (
            <p className="text-sm text-muted">
              Desperdício: registre as gramas reais de pelo menos {AMOSTRA_MINIMA} entregas sem falha (hoje: {r.comGramas}).
            </p>
          ) : r.desperdicioSugerido !== null ? (
            <div className="space-y-2">
              <p className="text-sm">
                Desperdício de filamento: hoje <b className="font-mono">{pct(desperdicioAtual)}</b>, sugerido{" "}
                <b className="font-mono">{pct(r.desperdicioSugerido)}</b> (o que teria acertado as gramas reais).
              </p>
              <BotaoAplicar
                key={`desperdicio-${r.desperdicioSugerido}`}
                acao={aplicarSugestao.bind(null, "desperdicio_pct", r.desperdicioSugerido)}
                rotulo={`Usar ${pct(r.desperdicioSugerido)} de desperdício`}
              />
            </div>
          ) : (
            <p className="text-sm">Desperdício ({pct(desperdicioAtual)}) de acordo com o real.</p>
          )}
        </div>

        {r.desvioHoras !== null && r.comHoras >= AMOSTRA_MINIMA && Math.abs(r.desvioHoras) >= 0.05 && (
          <p className="border-t border-line pt-3 text-sm">
            Suas impressões levam {desvio(r.desvioHoras)} do tempo do fatiador. Ao orçar, considere ajustar o &quot;Tempo por mesa&quot;
            nessa proporção.
          </p>
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
