"use client";

import Link from "next/link";
import { startTransition, useId, useMemo, useOptimistic, useState } from "react";
import { BotaoExcluir } from "@/components/botao-excluir";
import { caixaClass, controleClass, Formulario } from "@/components/formulario";
import { Kpi } from "@/components/kpi";
import { STATUS_ORCAMENTO, type StatusOrcamento } from "@/lib/dominio";
import type { GrupoCampos } from "@/lib/form";
import { formatarBRL, formatarNumero } from "@/lib/formato";
import { DIA_MS, indicadores, linkWhatsApp, mensagemFollowup, normalizarBusca, precisaFollowup } from "@/lib/orcamento";
import { alterarStatus, excluirOrcamento, registrarEntrega } from "./actions";

export type ItemHistorico = {
  id: string;
  criadoEm: string;
  peca: string;
  material: string;
  quantidade: number;
  pintado: boolean;
  preco: number;
  lucro: number;
  status: StatusOrcamento;
  statusAlteradoEm: string;
  horasEstimadas: number | null;
  gramasEstimadas: number | null;
  horasReais: number | null;
  gramasReais: number | null;
  houveFalha: boolean | null;
  observacao: string | null;
  clienteId: string | null;
  clienteNome: string | null;
  clienteTelefone: string | null;
};

const ROTULO_STATUS: Record<StatusOrcamento, string> = {
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  entregue: "Entregue",
};

const COR_STATUS: Record<StatusOrcamento, string> = {
  enviado: "text-c6",
  aprovado: "text-ok",
  recusado: "text-danger",
  entregue: "text-muted",
};

/** Campos em branco, com o estimado como dica: pré-preencher faria um "ok" sem olhar gravar real = estimado. */
function camposEntrega(o: ItemHistorico): GrupoCampos[] {
  return [
    {
      campos: [
        {
          nome: "horas_reais",
          rotulo: "Horas reais de impressão",
          tipo: "decimal",
          sufixo: "h",
          ajuda: o.horasEstimadas !== null ? `Estimado: ${formatarNumero(o.horasEstimadas)} h` : undefined,
        },
        {
          nome: "gramas_reais",
          rotulo: "Filamento real usado",
          tipo: "decimal",
          sufixo: "g",
          ajuda: o.gramasEstimadas !== null ? `Estimado: ${formatarNumero(o.gramasEstimadas, 0)} g` : undefined,
        },
        { nome: "houve_falha", rotulo: "Houve falha (reimpressão)?", tipo: "checkbox" },
        { nome: "observacao_entrega", rotulo: "Observação", tipo: "texto", inteiro: true },
      ],
    },
  ];
}
const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

type Props = {
  itens: ItemHistorico[];
  clientes: { id: string; nome: string }[];
  followupDias: number;
  clienteInicial: string;
  truncado: boolean;
};

export function ListaHistorico({ itens, clientes, followupDias, clienteInicial, truncado }: Props) {
  const [status, setStatus] = useState("");
  const [cliente, setCliente] = useState(clienteInicial);
  const [busca, setBusca] = useState("");
  const [agora] = useState(() => Date.now());

  const visiveis = useMemo(() => {
    const q = normalizarBusca(busca.trim());
    return itens.filter(
      (o) =>
        (!status || o.status === status) &&
        (!cliente || o.clienteId === cliente) &&
        (!q || [o.peca, o.clienteNome, o.material].some((v) => normalizarBusca(v).includes(q))),
    );
  }, [itens, status, cliente, busca]);

  const ind = indicadores(visiveis);
  const pendentes = visiveis.filter((o) => precisaFollowup({ status: o.status, status_alterado_em: o.statusAlteradoEm }, followupDias, agora));

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_1.4fr]">
        <Filtro rotulo="Status">
          {(id) => (
            <select id={id} value={status} onChange={(e) => setStatus(e.target.value)} className={controleClass}>
              <option value="">Todos</option>
              {STATUS_ORCAMENTO.map((s) => (
                <option key={s} value={s}>{ROTULO_STATUS[s]}</option>
              ))}
            </select>
          )}
        </Filtro>
        <Filtro rotulo="Cliente">
          {(id) => (
            <select id={id} value={cliente} onChange={(e) => setCliente(e.target.value)} className={controleClass}>
              <option value="">Todos</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          )}
        </Filtro>
        <Filtro rotulo="Buscar">
          {(id) => (
            <input id={id} type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Peça, cliente ou material" className={controleClass} />
          )}
        </Filtro>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi rotulo="Orçamentos" valor={String(ind.quantidade)} />
        <Kpi rotulo="Aprovação" valor={ind.taxaAprovacao === null ? "—" : `${Math.round(ind.taxaAprovacao * 100)}%`} />
        <Kpi rotulo="Fechado" valor={formatarBRL(ind.valorFechado)} />
        <Kpi rotulo="Lucro estimado" valor={formatarBRL(ind.lucroEstimado)} />
      </div>

      {truncado && (
        <p className="text-xs text-muted">Mostrando os 500 orçamentos mais recentes; os indicadores consideram só eles.</p>
      )}

      {pendentes.length > 0 && (
        <p className="rounded border-l-[3px] border-warn bg-soft px-3 py-2 text-sm">
          {pendentes.length} orçamento(s) enviado(s) há mais de {followupDias} dias sem resposta. Vale cobrar o cliente.
        </p>
      )}

      {visiveis.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          {itens.length ? "Nenhum orçamento com esses filtros." : "Nenhum orçamento salvo ainda. Monte um em Orçamento e toque em Salvar orçamento."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((o) => (
            <Linha
              key={o.id}
              o={o}
              followup={precisaFollowup({ status: o.status, status_alterado_em: o.statusAlteradoEm }, followupDias, agora)}
              diasEnviado={Math.floor((agora - new Date(o.statusAlteradoEm).getTime()) / DIA_MS)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Linha({ o, followup, diasEnviado }: { o: ItemHistorico; followup: boolean; diasEnviado: number }) {
  // Otimista: mostra o novo status na hora e volta ao valor do servidor quando a ação termina.
  const [status, setStatusOtimista] = useOptimistic(o.status);
  const [entregando, setEntregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const whatsapp = linkWhatsApp(o.clienteTelefone, mensagemFollowup(o.clienteNome, o.peca));

  function mudarStatus(novo: StatusOrcamento) {
    setErro(null);
    if (novo === "entregue") {
      setEntregando(true);
      return;
    }
    setEntregando(false);
    startTransition(async () => {
      setStatusOtimista(novo);
      const r = await alterarStatus(o.id, novo);
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <li
      className={`rounded-md border bg-panel px-4 py-3 ${followup ? "border-warn border-l-4" : "border-line"}`}
      data-testid="orcamento"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {o.clienteNome ?? "Sem cliente"}
            <span className="ml-2 font-mono text-xs text-muted">{data(o.criadoEm)}</span>
          </div>
          <div className="text-xs text-muted">
            {o.peca} · {o.material} · {o.quantidade} pç{o.pintado ? " · pintado" : ""}
          </div>
          {status === "entregue" && (o.horasReais !== null || o.gramasReais !== null || o.houveFalha !== null) && (
            <div className="mt-1 text-xs text-muted">
              Real: {o.horasReais !== null ? `${formatarNumero(o.horasReais)} h` : "— h"}
              {o.horasEstimadas !== null && ` (est. ${formatarNumero(o.horasEstimadas)} h)`} ·{" "}
              {o.gramasReais !== null ? `${formatarNumero(o.gramasReais, 0)} g` : "— g"}
              {o.gramasEstimadas !== null && ` (est. ${formatarNumero(o.gramasEstimadas, 0)} g)`} ·{" "}
              {o.houveFalha ? "com falha" : "sem falha"}
            </div>
          )}
        </div>
        <div className="text-right font-mono font-semibold whitespace-nowrap">{formatarBRL(o.preco)}</div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          aria-label={`Status de ${o.peca}`}
          value={entregando ? "entregue" : status}
          onChange={(e) => mudarStatus(e.target.value as StatusOrcamento)}
          className={`cursor-pointer rounded-full border border-current bg-bg px-2.5 py-1 text-xs font-semibold ${COR_STATUS[entregando ? "entregue" : status]}`}
        >
          {STATUS_ORCAMENTO.map((s) => (
            <option key={s} value={s}>{ROTULO_STATUS[s]}</option>
          ))}
        </select>
        <Link href={`/?id=${o.id}`} className="rounded border border-line px-2.5 py-1 text-xs font-semibold">
          Abrir
        </Link>
        {status === "entregue" && !entregando && (
          <button type="button" onClick={() => setEntregando(true)} className="rounded border border-line px-2.5 py-1 text-xs font-semibold">
            Editar entrega
          </button>
        )}
        {followup && status === "enviado" && (
          <>
            <span className="text-xs text-warn">Enviado há {diasEnviado} dias</span>
            <button type="button" onClick={() => mudarStatus("recusado")} className="rounded border border-line px-2.5 py-1 text-xs font-semibold text-danger">
              Marcar recusado
            </button>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded border border-accent px-2.5 py-1 text-xs font-semibold text-accent">
                Abrir WhatsApp
              </a>
            )}
          </>
        )}
        <div className="ml-auto">
          <BotaoExcluir acao={excluirOrcamento.bind(null, o.id)} aviso="Toque de novo para excluir." />
        </div>
      </div>
      {erro && <p className="mt-1 text-sm text-danger">{erro}</p>}

      {entregando && (
        <div className="mt-3 rounded border border-line bg-bg p-3">
          <p className="mb-2 text-sm font-medium">Registrar entrega</p>
          <Formulario
            grupos={camposEntrega(o)}
            valores={{
              horas_reais: o.horasReais,
              gramas_reais: o.gramasReais,
              houve_falha: o.houveFalha ?? false,
              observacao_entrega: o.observacao,
            }}
            acao={async (estado, fd) => {
              const r = await registrarEntrega(o.id, estado, fd);
              if (r.ok) setEntregando(false);
              return r;
            }}
            rotuloBotao="Marcar como entregue"
          />
          <button type="button" onClick={() => setEntregando(false)} className="mt-2 text-sm text-muted underline">
            Cancelar
          </button>
        </div>
      )}
    </li>
  );
}

function Filtro({ rotulo, children }: { rotulo: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-[13px] text-muted">{rotulo}</label>
      <div className={caixaClass}>{children(id)}</div>
    </div>
  );
}

