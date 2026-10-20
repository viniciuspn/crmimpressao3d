"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { caixaClass, controleClass, unidadeClass } from "@/components/formulario";
import { Kpi } from "@/components/kpi";
import { arredondar2, calcular, custoPorUnidade, precoPorKg, type ComponenteCusto, type ResultadoCalculo } from "@/lib/calculo";
import { BASES_INSUMO, type BaseInsumo, type UnidadeInsumo } from "@/lib/dominio";
import { formatarBRL, formatarCustoUnitario, formatarNumero, numeroParaCampo, paraNumero } from "@/lib/formato";
import {
  entradaOrcamentoSchema,
  FILAMENTOS_GENERICOS,
  paraEntradaCalculo,
  rotuloMaterial,
  textoOrcamento,
  type EntradaOrcamento,
  type FilamentoGenerico,
  type LinhaInsumoOrcamento,
} from "@/lib/orcamento";
import { salvarOrcamento } from "./actions";

// ---------- Dados vindos do servidor ----------

export type Config = {
  tarifa_kwh: number;
  desperdicio_pct: number;
  taxa_falha_pct: number;
  valor_hora: number;
  preparo_min: number;
  acabamento_min_peca: number;
  embalagem_pedido: number;
  margem_pct: number;
  taxa_pagamento_pct: number;
  pedido_minimo: number;
  retorno_ativo: boolean;
  retorno_meses: number;
  retorno_horas_mes: number;
  validade_orcamento_dias: number;
  pintura_insumos_peca: number;
  pintura_min_peca: number;
};
export type FilamentoOpcao = { id: string; nome: string; tipo: string; preco_rolo: number; frete: number; peso_rolo_g: number };
export type ImpressoraOpcao = { id: string; nome: string; preco: number; vida_util_h: number; consumo_w: number; manutencao_h: number };
export type InsumoOpcao = { id: string; nome: string; unidade: UnidadeInsumo; preco_pago: number; qtd_embalagem: number };
export type ClienteOpcao = { id: string; nome: string };
export type OrcamentoAberto = {
  id: string;
  entrada: EntradaOrcamento;
  material: string;
  impressoraNome: string;
  criadoEm: string;
  cliente: string | null;
};

type Props = {
  config: Config;
  filamentos: FilamentoOpcao[];
  impressoras: ImpressoraOpcao[];
  insumos: InsumoOpcao[];
  clientes: ClienteOpcao[];
  orcamento: OrcamentoAberto | null;
  mensagemInicial?: string | null;
  /** Pré-seleciona o cliente num orçamento novo (vindo da página do cliente). */
  clienteInicial?: string;
};

// ---------- Estado do formulário (textos como digitados) ----------

const CAMPOS_NUMERICOS = [
  "quantidade", "pecas_por_mesa", "gramas_por_mesa", "horas_por_mesa",
  "preco_kg", "desperdicio_pct",
  "consumo_w", "preco_impressora", "vida_util_h", "manutencao_h", "tarifa_kwh", "taxa_falha_pct",
  "valor_hora", "preparo_min", "acabamento_min_peca", "extras_peca", "embalagem_pedido",
  "pintura_insumos_peca", "pintura_min_peca",
  "retorno_meses", "retorno_horas_mes",
  "margem_pct", "taxa_pagamento_pct", "pedido_minimo",
] as const;
type CampoNumerico = (typeof CAMPOS_NUMERICOS)[number];

type Estado = {
  peca: string;
  clienteId: string;
  /** "db:<id>" (cadastrado) ou "gen:<nome>" (genérico). */
  filamento: string;
  /** "" = manual. */
  impressoraId: string;
  pintado: boolean;
  retorno_ativo: boolean;
  linhas: LinhaInsumoOrcamento[];
} & Record<CampoNumerico, string>;

function estadoInicial({ config, filamentos, impressoras, orcamento, clientes, clienteInicial }: Props): Estado {
  if (orcamento) {
    const e = orcamento.entrada;
    const numeros = Object.fromEntries(CAMPOS_NUMERICOS.map((c) => [c, numeroParaCampo(e[c])])) as Record<CampoNumerico, string>;
    return {
      ...numeros,
      peca: e.peca,
      clienteId: e.cliente_id ?? "",
      filamento: e.filamento.tipo === "cadastro" ? `db:${e.filamento.id}` : `gen:${e.filamento.nome}`,
      impressoraId: e.impressora_id ?? "",
      pintado: e.pintado,
      retorno_ativo: e.retorno_ativo,
      linhas: e.insumos,
    };
  }

  const f = filamentos[0];
  const imp = impressoras[0];
  const n = numeroParaCampo;
  return {
    peca: "",
    clienteId: clientes.some((c) => c.id === clienteInicial) ? clienteInicial! : "",
    filamento: f ? `db:${f.id}` : "gen:PLA",
    impressoraId: imp?.id ?? "",
    pintado: false,
    retorno_ativo: config.retorno_ativo,
    linhas: [],
    quantidade: "1",
    pecas_por_mesa: "1",
    gramas_por_mesa: "",
    horas_por_mesa: "",
    preco_kg: n(f ? arredondar2(precoPorKg(f)) : FILAMENTOS_GENERICOS.PLA),
    desperdicio_pct: n(config.desperdicio_pct),
    consumo_w: n(imp?.consumo_w ?? 120),
    preco_impressora: n(imp?.preco ?? 3000),
    vida_util_h: n(imp?.vida_util_h ?? 6000),
    manutencao_h: n(imp?.manutencao_h ?? 0),
    tarifa_kwh: n(config.tarifa_kwh),
    taxa_falha_pct: n(config.taxa_falha_pct),
    valor_hora: n(config.valor_hora),
    preparo_min: n(config.preparo_min),
    acabamento_min_peca: n(config.acabamento_min_peca),
    extras_peca: "0",
    embalagem_pedido: n(config.embalagem_pedido),
    pintura_insumos_peca: n(config.pintura_insumos_peca),
    pintura_min_peca: n(config.pintura_min_peca),
    retorno_meses: n(config.retorno_meses),
    retorno_horas_mes: n(config.retorno_horas_mes),
    margem_pct: n(config.margem_pct),
    taxa_pagamento_pct: n(config.taxa_pagamento_pct),
    pedido_minimo: n(config.pedido_minimo),
  };
}

/**
 * Converte o estado em entrada validada (mesmo schema do servidor).
 * Devolve também os campos inválidos, para destacá-los. Sem descrição, o cálculo ao vivo usa
 * "Impressão 3D"; para salvar, a descrição é obrigatória (validada em salvar()).
 */
function montarEntrada(s: Estado): { entrada: EntradaOrcamento | null; invalidos: Set<string> } {
  const numeros: Record<string, number> = Object.fromEntries(
    CAMPOS_NUMERICOS.map((c) => [c, paraNumero(s[c]) ?? Number.NaN]),
  );
  // Retorno desligado: os campos dele não importam para o cálculo.
  if (!s.retorno_ativo) {
    if (!(numeros.retorno_meses >= 1)) numeros.retorno_meses = 12;
    if (!(numeros.retorno_horas_mes >= 1)) numeros.retorno_horas_mes = 160;
  }
  const filamento = s.filamento.startsWith("db:")
    ? { tipo: "cadastro" as const, id: s.filamento.slice(3) }
    : { tipo: "generico" as const, nome: s.filamento.slice(4) };
  const r = entradaOrcamentoSchema.safeParse({
    ...numeros,
    peca: s.peca.trim() || "Impressão 3D",
    cliente_id: s.clienteId || null,
    filamento,
    impressora_id: s.impressoraId || null,
    pintado: s.pintado,
    retorno_ativo: s.retorno_ativo,
    insumos: s.linhas,
  });
  if (r.success) return { entrada: r.data, invalidos: new Set() };
  return { entrada: null, invalidos: new Set(r.error.issues.map((i) => String(i.path[0]))) };
}

// ---------- Composição do custo ----------

const COMPONENTES: { chave: ComponenteCusto; rotulo: string; cor: string }[] = [
  { chave: "material", rotulo: "Filamento", cor: "var(--c1)" },
  { chave: "energia", rotulo: "Energia", cor: "var(--c2)" },
  { chave: "depreciacao", rotulo: "Depreciação", cor: "var(--c3)" },
  { chave: "manutencao", rotulo: "Manutenção", cor: "var(--c4)" },
  { chave: "falhas", rotulo: "Reserva p/ falhas", cor: "var(--c5)" },
  { chave: "mao_de_obra", rotulo: "Mão de obra", cor: "var(--c6)" },
  { chave: "insumos", rotulo: "Insumos e extras", cor: "var(--c7)" },
  { chave: "pintura", rotulo: "Pintura", cor: "var(--c8)" },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

// ---------- Componente ----------

export function EditorOrcamento(props: Props) {
  const { filamentos, impressoras, insumos, clientes, orcamento, config } = props;
  const router = useRouter();
  const [s, setS] = useState<Estado>(() => estadoInicial(props));
  const [salvando, iniciarSalvar] = useTransition();
  const [mensagem, setMensagem] = useState<{ texto: string; erro?: boolean } | null>(
    props.mensagemInicial ? { texto: props.mensagemInicial } : null,
  );
  const [tentouSalvar, setTentouSalvar] = useState(false);

  const set = <K extends keyof Estado>(campo: K, valor: Estado[K]) => setS((atual) => ({ ...atual, [campo]: valor }));

  const { entrada, invalidos } = useMemo(() => montarEntrada(s), [s]);
  const resultado: ResultadoCalculo | null = useMemo(() => {
    if (!entrada) return null;
    try {
      return calcular(paraEntradaCalculo(entrada));
    } catch {
      return null;
    }
  }, [entrada]);

  const filamentoAtual = s.filamento.startsWith("db:") ? filamentos.find((f) => f.id === s.filamento.slice(3)) : undefined;
  const genericoAtual = s.filamento.startsWith("gen:") ? s.filamento.slice(4) : undefined;
  const material = filamentoAtual
    ? rotuloMaterial(filamentoAtual)
    : (genericoAtual ?? (orcamento?.material || "—"));
  const cliente = clientes.find((c) => c.id === s.clienteId);

  function escolherFilamento(valor: string) {
    const f = valor.startsWith("db:") ? filamentos.find((x) => x.id === valor.slice(3)) : undefined;
    const g = valor.startsWith("gen:") ? (valor.slice(4) as FilamentoGenerico) : undefined;
    setS((a) => ({
      ...a,
      filamento: valor,
      preco_kg: f ? numeroParaCampo(arredondar2(precoPorKg(f))) : g ? numeroParaCampo(FILAMENTOS_GENERICOS[g]) : a.preco_kg,
    }));
  }

  function escolherImpressora(id: string) {
    const p = impressoras.find((x) => x.id === id);
    setS((a) => ({
      ...a,
      impressoraId: id,
      ...(p && {
        consumo_w: numeroParaCampo(p.consumo_w),
        preco_impressora: numeroParaCampo(p.preco),
        vida_util_h: numeroParaCampo(p.vida_util_h),
        manutencao_h: numeroParaCampo(p.manutencao_h),
      }),
    }));
  }

  function salvar() {
    setTentouSalvar(true);
    if (!s.peca.trim()) {
      setMensagem({ texto: "Descreva a peça antes de salvar.", erro: true });
      return;
    }
    if (!entrada || !resultado) {
      setMensagem({ texto: "Corrija os campos destacados antes de salvar.", erro: true });
      return;
    }
    setMensagem(null);
    iniciarSalvar(async () => {
      const r = await salvarOrcamento(orcamento?.id ?? null, entrada);
      if (!r.ok) return setMensagem({ texto: r.erro, erro: true });
      setMensagem({ texto: r.mensagem });
      // ?salvo=1: o editor é remontado com o id novo e mostra a mensagem de novo.
      if (!orcamento) router.replace(`/?id=${r.id}&salvo=1`);
      else router.refresh();
    });
  }

  const texto = resultado
    ? textoOrcamento({
        peca: s.peca,
        cliente: cliente?.nome,
        material,
        pintado: s.pintado,
        quantidade: entrada!.quantidade,
        horas: resultado.horas,
        preco: resultado.preco,
        validadeDias: config.validade_orcamento_dias,
      })
    : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setMensagem({ texto: "Orçamento copiado. É só colar no WhatsApp." });
    } catch {
      setMensagem({ texto: "Não consegui copiar. Selecione o texto e copie manualmente.", erro: true });
    }
  }

  const num = (c: CampoNumerico) => paraNumero(s[c]);
  // Destaca só o que já foi digitado errado; campos vazios ficam vermelhos depois de tentar salvar.
  const invalido = (c: CampoNumerico) => invalidos.has(c) && (tentouSalvar || s[c].trim() !== "");
  const campo = (c: CampoNumerico, rotulo: string, extra: { prefixo?: string; sufixo?: string; inteiro?: boolean } = {}) => (
    <CampoNumero
      rotulo={rotulo}
      valor={s[c]}
      onChange={(v) => set(c, v)}
      invalido={invalido(c)}
      {...extra}
    />
  );

  // Dicas ao vivo (como no protótipo)
  const r = resultado;
  const sobra = r && entrada ? r.mesas * entrada.pecas_por_mesa - entrada.quantidade : 0;
  const custoMaquinaH =
    (num("consumo_w") ?? 0) / 1000 * (num("tarifa_kwh") ?? 0) +
    (num("preco_impressora") ?? 0) / Math.max(1, num("vida_util_h") ?? 1) +
    (num("manutencao_h") ?? 0);
  const tintaDuplicada =
    s.pintado && (num("pintura_insumos_peca") ?? 0) > 0 && s.linhas.some((l) => /tinta/i.test(l.nome));

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="grid min-w-0 gap-3.5">
        <Secao titulo="Trabalho (do fatiador)">
          <Grade>
            <CampoTexto
              rotulo="Peça / descrição"
              valor={s.peca}
              onChange={(v) => set("peca", v)}
              placeholder="Suporte de headset"
              invalido={tentouSalvar && !s.peca.trim()}
            />
            <CampoSelecao rotulo="Cliente" valor={s.clienteId} onChange={(v) => set("clienteId", v)}>
              <option value="">Sem cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </CampoSelecao>
            <CampoSelecao rotulo="Impressora" valor={s.impressoraId} onChange={escolherImpressora}>
              <option value="">Manual (preencher abaixo)</option>
              {impressoras.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
              {s.impressoraId && !impressoras.some((p) => p.id === s.impressoraId) && (
                <option value={s.impressoraId}>{orcamento?.impressoraNome || "Impressora do orçamento"} (inativa)</option>
              )}
            </CampoSelecao>
            <CampoSelecao rotulo="Filamento" valor={s.filamento} onChange={escolherFilamento}>
              {filamentos.length > 0 && (
                <optgroup label="Cadastrados">
                  {filamentos.map((f) => (
                    <option key={f.id} value={`db:${f.id}`}>{rotuloMaterial(f)}</option>
                  ))}
                </optgroup>
              )}
              {s.filamento.startsWith("db:") && !filamentoAtual && (
                <option value={s.filamento}>{orcamento?.material ?? "Filamento do orçamento"} (inativo)</option>
              )}
              <optgroup label="Genéricos">
                {Object.keys(FILAMENTOS_GENERICOS).map((g) => (
                  <option key={g} value={`gen:${g}`}>{g} (genérico)</option>
                ))}
              </optgroup>
            </CampoSelecao>
            {campo("quantidade", "Quantidade de peças", { sufixo: "un", inteiro: true })}
            {campo("pecas_por_mesa", "Peças por mesa", { sufixo: "un", inteiro: true })}
            {campo("gramas_por_mesa", "Filamento por mesa", { sufixo: "g" })}
            {campo("horas_por_mesa", "Tempo por mesa", { sufixo: "h" })}
          </Grade>
          {r && (
            <Dica>
              <b>{r.mesas}</b> mesa(s) · <b>{formatarNumero(r.horas)} h</b> de máquina · <b>{Math.round(r.gramas)} g</b> com desperdício
              {sobra > 0 && ` · última mesa com ${sobra} vaga(s) livre(s)`}
            </Dica>
          )}
        </Secao>

        <Secao titulo="Material">
          <Grade>
            {campo("preco_kg", "Preço por kg (com frete)", { prefixo: "R$" })}
            {campo("desperdicio_pct", "Desperdício (purga, saia)", { sufixo: "%" })}
          </Grade>
          <Dica>
            {filamentoAtual
              ? `Preço do cadastro: ${filamentoAtual.nome}. Alterar aqui vale só para este orçamento.`
              : "Preço médio genérico. Cadastre seu rolo em Cadastros para usar o preço real."}
          </Dica>
        </Secao>

        <Secao titulo="Máquina">
          <Grade>
            {campo("consumo_w", "Consumo médio", { sufixo: "W" })}
            {campo("preco_impressora", "Preço da impressora", { prefixo: "R$" })}
            {campo("vida_util_h", "Vida útil estimada", { sufixo: "h" })}
            {campo("manutencao_h", "Manutenção (bico, mesa, correias)", { prefixo: "R$", sufixo: "/h" })}
            {campo("tarifa_kwh", "Tarifa de energia", { prefixo: "R$", sufixo: "/kWh" })}
            {campo("taxa_falha_pct", "Taxa de falha", { sufixo: "%" })}
          </Grade>
          <Dica>
            Custo da máquina por hora (energia + depreciação + manutenção): <b>{formatarBRL(custoMaquinaH)}/h</b>
            <br />
            {s.impressoraId
              ? "Dados do cadastro. Alterar aqui vale só para este orçamento."
              : "Modo manual: cadastre a impressora em Cadastros para não digitar de novo."}
          </Dica>
        </Secao>

        <Secao titulo="Mão de obra e extras">
          <Grade>
            {campo("valor_hora", "Valor da sua hora", { prefixo: "R$", sufixo: "/h" })}
            {campo("preparo_min", "Preparo (modelar, fatiar, mesa)", { sufixo: "min" })}
            {campo("acabamento_min_peca", "Acabamento por peça", { sufixo: "min" })}
            {campo("extras_peca", "Outros extras por peça (avulso)", { prefixo: "R$" })}
            {campo("embalagem_pedido", "Embalagem / envio do pedido", { prefixo: "R$" })}
          </Grade>
        </Secao>

        <Secao titulo="Insumos do pedido">
          <AdicionarInsumo
            insumos={insumos}
            onAdicionar={(l) =>
              setS((a) => {
                const existente = a.linhas.findIndex((x) => x.insumo_id === l.insumo_id && x.base === l.base);
                if (existente < 0) return { ...a, linhas: [...a.linhas, l] };
                const linhas = [...a.linhas];
                // Soma a quantidade e passa a usar o custo atual do cadastro.
                linhas[existente] = { ...l, quantidade: linhas[existente].quantidade + l.quantidade };
                return { ...a, linhas };
              })
            }
          />
          {s.linhas.length > 0 && (
            <ul className="mt-3 grid gap-1.5">
              {s.linhas.map((l, i) => {
                const total = l.custo_unitario * l.quantidade * (l.base === "peca" ? (entrada?.quantidade ?? 1) : 1);
                return (
                  <li key={`${l.insumo_id}-${l.base}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-line bg-bg px-2.5 py-2 text-sm">
                    <span className="min-w-0 flex-[1_1_160px]">{l.nome}</span>
                    <span className="font-mono whitespace-nowrap">
                      {formatarNumero(l.quantidade, 4)} {l.unidade} {l.base === "peca" ? `× ${entrada?.quantidade ?? "?"} peça(s)` : "no pedido"}
                    </span>
                    <span className="font-mono whitespace-nowrap">{formatarBRL(total)}</span>
                    <button
                      type="button"
                      onClick={() => set("linhas", s.linhas.filter((_, j) => j !== i))}
                      className="rounded border border-line px-2 py-1 text-xs font-semibold text-danger"
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <Dica>
            {insumos.length === 0
              ? "Cadastre insumos (com a quantidade na embalagem) em Cadastros para escolher aqui."
              : s.linhas.length === 0
                ? "Nenhum insumo neste pedido."
                : null}
          </Dica>
        </Secao>

        <Secao titulo="Pintura (opcional)">
          <Marcador rotulo="Peça com pintura" marcado={s.pintado} onChange={(v) => set("pintado", v)} />
          <div className={`mt-3 ${s.pintado ? "" : "opacity-45"}`}>
            <Grade>
              {campo("pintura_insumos_peca", "Tinta e insumos por peça", { prefixo: "R$" })}
              {campo("pintura_min_peca", "Tempo de pintura por peça", { sufixo: "min" })}
            </Grade>
          </div>
          <Dica>O tempo de pintura é cobrado pelo valor da sua hora, igual ao preparo.</Dica>
          {tintaDuplicada && (
            <Aviso>Você tem tinta nos insumos do pedido e também na pintura por peça. Confira para não cobrar duas vezes.</Aviso>
          )}
        </Secao>

        <Secao titulo="Retorno da máquina (opcional)">
          <Marcador
            rotulo="Cobrar a mais para pagar a impressora antes da vida útil"
            marcado={s.retorno_ativo}
            onChange={(v) => set("retorno_ativo", v)}
          />
          <div className={`mt-3 ${s.retorno_ativo ? "" : "opacity-45"}`}>
            <Grade>
              {campo("retorno_meses", "Pagar em", { sufixo: "meses", inteiro: true })}
              {campo("retorno_horas_mes", "Uso real da impressora", { sufixo: "h/mês", inteiro: true })}
            </Grade>
          </div>
          <Dica>
            {!s.retorno_ativo || !r
              ? "Desligado: a máquina entra no custo só pela depreciação ao longo da vida útil."
              : r.meta_h <= r.deprec_h
                ? `Meta de ${formatarBRL(r.meta_h)}/h é menor que a depreciação (${formatarBRL(r.deprec_h)}/h). Nada é adicionado.`
                : `Meta ${formatarBRL(r.meta_h)}/h − depreciação já no custo ${formatarBRL(r.deprec_h)}/h = ${formatarBRL(r.meta_h - r.deprec_h)}/h a mais no preço, sem margem em cima.`}
          </Dica>
        </Secao>

        <Secao titulo="Preço">
          <Grade>
            {campo("margem_pct", "Margem sobre o custo", { sufixo: "%" })}
            {campo("taxa_pagamento_pct", "Taxa de pagamento/marketplace", { sufixo: "%" })}
            {campo("pedido_minimo", "Pedido mínimo", { prefixo: "R$" })}
          </Grade>
          <Dica>A taxa é embutida no preço: você recebe o valor líquido calculado, não o bruto menos a taxa.</Dica>
        </Secao>
      </div>

      <aside
        className="min-w-0 overflow-hidden rounded-md border border-line bg-panel lg:sticky lg:top-4"
      >
        <div className="bg-accent px-4.5 pt-4.5 pb-4 text-accent-ink" aria-live="polite">
          <small className="text-[11px] font-semibold tracking-[.12em] uppercase opacity-85">Preço sugerido</small>
          <div className="my-1 font-mono text-[clamp(34px,5vw,44px)] leading-tight font-semibold tracking-tight tabular-nums" data-testid="preco-total">
            {r ? formatarBRL(r.preco) : "—"}
          </div>
          <div className="font-mono text-sm opacity-90">
            {r && entrada ? `${formatarBRL(r.preco_por_peca)} por peça · ${entrada.quantidade} peça(s)` : "Preencha filamento e tempo por mesa"}
          </div>
        </div>

        <div className="grid gap-4 px-4.5 pt-4 pb-4.5">
          {orcamento && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-soft px-2.5 py-2 text-sm">
              <span>
                Editando orçamento de <b>{new Date(orcamento.criadoEm).toLocaleDateString("pt-BR")}{orcamento.cliente ? ` · ${orcamento.cliente}` : ""}</b>
              </span>
            </div>
          )}

          {r && (
            <>
              <div className="flex h-3 overflow-hidden rounded-sm bg-line" aria-hidden>
                {COMPONENTES.map((c) => (
                  <span key={c.chave} style={{ width: `${(r.componentes[c.chave] / (r.custo_total || 1)) * 100}%`, background: c.cor }} />
                ))}
              </div>
              <table className="w-full border-collapse text-sm tabular-nums">
                <tbody>
                  {COMPONENTES.filter((c) => c.chave !== "pintura" || s.pintado).map((c) => (
                    <tr key={c.chave} className="border-b border-dashed border-line">
                      <td className="py-1.5">
                        <span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: c.cor }} />
                        {c.rotulo}
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {formatarBRL(r.componentes[c.chave])}
                        <span className="ml-1.5 text-xs text-muted">{pct(r.componentes[c.chave] / (r.custo_total || 1))}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-ink font-semibold">
                    <td className="pt-2.5">Custo total</td>
                    <td className="pt-2.5 text-right font-mono">{formatarBRL(r.custo_total)}</td>
                  </tr>
                  {r.retorno > 0 && (
                    <tr className="text-[13px] text-muted">
                      <td className="pt-1.5">+ Retorno acelerado (entra no preço)</td>
                      <td className="pt-1.5 text-right font-mono">{formatarBRL(r.retorno)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="grid grid-cols-3 gap-2">
                <Kpi rotulo="Lucro líquido" valor={formatarBRL(r.lucro)} />
                <Kpi rotulo="Margem real" valor={r.margem_real === null ? "—" : pct(r.margem_real)} />
                <Kpi rotulo="Seu R$/hora" valor={r.valor_hora_real === null ? "—" : formatarBRL(r.valor_hora_real)} />
              </div>

              {(r.avisos.pedido_minimo_aplicado || r.avisos.mao_de_obra_alta || r.retorno > 0) && (
                <Aviso>
                  {[
                    r.avisos.pedido_minimo_aplicado &&
                      `Pedido mínimo aplicado: o cálculo dava ${formatarBRL(r.preco_calculado)}.`,
                    r.avisos.mao_de_obra_alta &&
                      "A mão de obra pesa mais que 3× o filamento. Em peças pequenas, quem define o preço é o seu tempo.",
                    r.retorno > 0 && `O lucro mostrado inclui ${formatarBRL(r.retorno)} de retorno acelerado da impressora.`,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </Aviso>
              )}

              <textarea
                aria-label="Texto do orçamento"
                readOnly
                value={texto}
                className="min-h-40 w-full resize-y rounded border border-line bg-bg p-2.5 font-mono text-[12.5px] text-ink"
              />
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="rounded border border-accent bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
            >
              {salvando ? "Salvando…" : orcamento ? "Atualizar orçamento" : "Salvar orçamento"}
            </button>
            <button
              type="button"
              onClick={copiar}
              disabled={!r}
              className="rounded border border-line px-3.5 py-2 text-sm font-semibold text-ink disabled:opacity-50"
            >
              Copiar texto
            </button>
            <button
              type="button"
              onClick={() => router.push(`/?novo=${Date.now()}`)}
              className="rounded border border-line px-3.5 py-2 text-sm font-semibold text-ink"
            >
              Novo orçamento
            </button>
          </div>
          <p role="status" className={`min-h-[1em] text-[13px] ${mensagem?.erro ? "text-danger" : "text-accent"}`}>
            {mensagem?.texto}
          </p>
        </div>
      </aside>
    </div>
  );
}

// ---------- Peças de interface ----------

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-md border border-line bg-panel px-4 pt-2 pb-4">
      <legend className="px-1.5 text-[11px] font-semibold tracking-[.12em] text-muted uppercase">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Grade({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">{children}</div>;
}

function Dica({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="mt-2.5 text-xs text-muted [&_b]:font-mono [&_b]:font-medium [&_b]:text-ink">{children}</p>;
}

function Aviso({ children }: { children: ReactNode }) {
  return <div className="mt-2 rounded border-l-[3px] border-warn bg-soft px-2.5 py-2 text-[13px]">{children}</div>;
}

function Rotulo({ id, rotulo, children }: { id: string; rotulo: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={id} className="text-[13px] text-muted">{rotulo}</label>
      {children}
    </div>
  );
}

function CampoNumero(p: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  invalido?: boolean;
  prefixo?: string;
  sufixo?: string;
  inteiro?: boolean;
}) {
  const id = useId();
  return (
    <Rotulo id={id} rotulo={p.rotulo}>
      <div className={caixaClass}>
        {p.prefixo && <span className={`${unidadeClass} border-r`}>{p.prefixo}</span>}
        <input
          id={id}
          type="text"
          inputMode={p.inteiro ? "numeric" : "decimal"}
          autoComplete="off"
          value={p.valor}
          onChange={(e) => p.onChange(e.target.value)}
          aria-invalid={p.invalido || undefined}
          className={`${controleClass} font-mono tabular-nums`}
        />
        {p.sufixo && <span className={`${unidadeClass} border-l`}>{p.sufixo}</span>}
      </div>
    </Rotulo>
  );
}

function CampoTexto(p: { rotulo: string; valor: string; onChange: (v: string) => void; placeholder?: string; invalido?: boolean }) {
  const id = useId();
  return (
    <Rotulo id={id} rotulo={p.rotulo}>
      <div className={caixaClass}>
        <input
          id={id}
          type="text"
          value={p.valor}
          maxLength={120}
          placeholder={p.placeholder}
          aria-invalid={p.invalido || undefined}
          onChange={(e) => p.onChange(e.target.value)}
          className={controleClass}
        />
      </div>
    </Rotulo>
  );
}

function CampoSelecao(p: { rotulo: string; valor: string; onChange: (v: string) => void; children: ReactNode }) {
  const id = useId();
  return (
    <Rotulo id={id} rotulo={p.rotulo}>
      <div className={caixaClass}>
        <select id={id} value={p.valor} onChange={(e) => p.onChange(e.target.value)} className={controleClass}>
          {p.children}
        </select>
      </div>
    </Rotulo>
  );
}

function Marcador({ rotulo, marcado, onChange }: { rotulo: string; marcado: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
      <input type="checkbox" checked={marcado} onChange={(e) => onChange(e.target.checked)} className="size-[18px] accent-(--accent)" />
      {rotulo}
    </label>
  );
}

function AdicionarInsumo({ insumos, onAdicionar }: { insumos: InsumoOpcao[]; onAdicionar: (l: LinhaInsumoOrcamento) => void }) {
  const [insumoId, setInsumoId] = useState(insumos[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState("1");
  const [base, setBase] = useState<BaseInsumo>("peca");
  const insumo = insumos.find((i) => i.id === insumoId);
  const qtd = paraNumero(quantidade);

  return (
    <div className="grid grid-cols-2 items-end gap-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
      <div className="col-span-2 sm:col-span-1">
        <CampoSelecao rotulo="Insumo" valor={insumoId} onChange={setInsumoId}>
          {insumos.length === 0 && <option value="">Nenhum insumo disponível</option>}
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome} · {formatarCustoUnitario(custoPorUnidade(i) ?? 0)}/{i.unidade}
            </option>
          ))}
        </CampoSelecao>
      </div>
      <CampoNumero rotulo="Quantidade" valor={quantidade} onChange={setQuantidade} sufixo={insumo?.unidade ?? "un"} invalido={!qtd} />
      <CampoSelecao rotulo="Conta" valor={base} onChange={(v) => setBase(v as BaseInsumo)}>
        {BASES_INSUMO.map((b) => (
          <option key={b} value={b}>{b === "peca" ? "por peça" : "por pedido"}</option>
        ))}
      </CampoSelecao>
      <button
        type="button"
        disabled={!insumo || !qtd || qtd <= 0}
        onClick={() => {
          if (!insumo || !qtd) return;
          onAdicionar({
            insumo_id: insumo.id,
            nome: insumo.nome,
            unidade: insumo.unidade,
            custo_unitario: custoPorUnidade(insumo) ?? 0,
            quantidade: qtd,
            base,
          });
        }}
        className="col-span-2 rounded border border-accent bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50 sm:col-span-1"
      >
        Adicionar
      </button>
    </div>
  );
}
