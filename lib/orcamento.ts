// Regras do orçamento compartilhadas entre o editor (navegador) e a Server Action:
// entrada validada, conversão para o cálculo, texto do WhatsApp, follow-up e indicadores do histórico.
import { z } from "zod";
import type { EntradaCalculo } from "@/lib/calculo";
import { BASES_INSUMO, UNIDADES_INSUMO, type StatusOrcamento } from "@/lib/dominio";
import { formatarBRL } from "@/lib/formato";

/** Preço médio por kg dos filamentos genéricos (do protótipo), para orçar sem cadastro. */
export const FILAMENTOS_GENERICOS = {
  PLA: 110,
  "PLA Silk": 140,
  PETG: 105,
  ABS: 90,
  ASA: 150,
  TPU: 170,
  "PLA-CF": 220,
} as const;
export type FilamentoGenerico = keyof typeof FILAMENTOS_GENERICOS;
const NOMES_GENERICOS = Object.keys(FILAMENTOS_GENERICOS) as [FilamentoGenerico, ...FilamentoGenerico[]];

const valor = (max = 1_000_000_000) => z.number().finite().min(0).max(max);
const inteiroPositivo = (max = 100_000) => z.number().int().min(1).max(max);

export const linhaInsumoSchema = z.object({
  insumo_id: z.uuid().nullable(),
  nome: z.string().trim().min(1).max(120),
  unidade: z.enum(UNIDADES_INSUMO),
  custo_unitario: valor(),
  quantidade: z.number().finite().gt(0).max(1_000_000),
  base: z.enum(BASES_INSUMO),
});
export type LinhaInsumoOrcamento = z.infer<typeof linhaInsumoSchema>;

/** Tudo que o editor envia ao salvar. Valores numéricos já convertidos; percentuais em pontos (5 = 5%). */
export const entradaOrcamentoSchema = z.object({
  cliente_id: z.uuid().nullable(),
  peca: z.string().trim().min(1, "Descreva a peça").max(120),
  filamento: z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("cadastro"), id: z.uuid() }),
    z.object({ tipo: z.literal("generico"), nome: z.enum(NOMES_GENERICOS) }),
  ]),
  impressora_id: z.uuid().nullable(),

  quantidade: inteiroPositivo(),
  pecas_por_mesa: inteiroPositivo(10_000),
  gramas_por_mesa: valor(1_000_000),
  horas_por_mesa: valor(10_000),

  preco_kg: valor(1_000_000),
  desperdicio_pct: valor(100),
  preco_impressora: valor(),
  vida_util_h: z.number().finite().gt(0).max(10_000_000),
  consumo_w: valor(100_000),
  manutencao_h: valor(1_000_000),
  tarifa_kwh: valor(100),
  taxa_falha_pct: valor(100),

  valor_hora: valor(1_000_000),
  preparo_min: valor(100_000),
  acabamento_min_peca: valor(100_000),
  extras_peca: valor(),
  embalagem_pedido: valor(),
  insumos: z.array(linhaInsumoSchema).max(50),

  pintado: z.boolean(),
  pintura_insumos_peca: valor(),
  pintura_min_peca: valor(100_000),

  retorno_ativo: z.boolean(),
  retorno_meses: inteiroPositivo(600),
  retorno_horas_mes: inteiroPositivo(744),

  margem_pct: valor(9999),
  taxa_pagamento_pct: z.number().finite().min(0).lt(100),
  pedido_minimo: valor(),
});
export type EntradaOrcamento = z.infer<typeof entradaOrcamentoSchema>;

export function paraEntradaCalculo(e: EntradaOrcamento): EntradaCalculo {
  return {
    quantidade: e.quantidade,
    pecas_por_mesa: e.pecas_por_mesa,
    gramas_por_mesa: e.gramas_por_mesa,
    horas_por_mesa: e.horas_por_mesa,
    preco_kg: e.preco_kg,
    desperdicio_pct: e.desperdicio_pct,
    preco_impressora: e.preco_impressora,
    vida_util_h: e.vida_util_h,
    consumo_w: e.consumo_w,
    manutencao_h: e.manutencao_h,
    tarifa_kwh: e.tarifa_kwh,
    taxa_falha_pct: e.taxa_falha_pct,
    valor_hora: e.valor_hora,
    preparo_min: e.preparo_min,
    acabamento_min_peca: e.acabamento_min_peca,
    insumos: e.insumos.map((l) => ({ custo_unitario: l.custo_unitario, quantidade: l.quantidade, base: l.base })),
    extras_peca: e.extras_peca,
    embalagem_pedido: e.embalagem_pedido,
    pintado: e.pintado,
    pintura_insumos_peca: e.pintura_insumos_peca,
    pintura_min_peca: e.pintura_min_peca,
    retorno_ativo: e.retorno_ativo,
    retorno_meses: e.retorno_meses,
    retorno_horas_mes: e.retorno_horas_mes,
    margem_pct: e.margem_pct,
    taxa_pagamento_pct: e.taxa_pagamento_pct,
    pedido_minimo: e.pedido_minimo,
  };
}

/** Nome do material para o texto e a lista: "PLA Preto (PLA)" quando o nome não cita o tipo. */
export function rotuloMaterial(f: { nome: string; tipo?: string | null } | null, generico?: string) {
  if (!f) return generico ?? "—";
  return f.tipo && !f.nome.toLowerCase().includes(f.tipo.toLowerCase()) ? `${f.nome} (${f.tipo})` : f.nome;
}

/** Texto do orçamento para o WhatsApp (formato da seção 4 da spec; a linha do cliente só aparece se houver). */
export function textoOrcamento(d: {
  peca: string;
  cliente?: string | null;
  material: string;
  pintado: boolean;
  quantidade: number;
  horas: number;
  preco: number;
  validadeDias: number;
}) {
  return [
    `*Orçamento — ${d.peca.trim() || "Impressão 3D"}*`,
    ...(d.cliente ? [`Cliente: ${d.cliente}`] : []),
    `Material: ${d.material}`,
    `Acabamento: ${d.pintado ? "pintado" : "sem pintura"}`,
    `Quantidade: ${d.quantidade} peça(s)`,
    // toPrecision tira o ruído de ponto flutuante (2,2 × 25 = 55.00000000000001 não vira ~56 h)
    `Tempo de produção: ~${Math.ceil(Number(d.horas.toPrecision(12)))} h de impressão`,
    "",
    `Valor por peça: ${formatarBRL(d.preco / d.quantidade)}`,
    `*Total: ${formatarBRL(d.preco)}*`,
    "",
    `Orçamento válido por ${d.validadeDias} dias.`,
  ].join("\n");
}

/** Link wa.me quando o telefone tem DDD (10 ou 11 dígitos, ou já com 55). Null se não der. */
export function linkWhatsApp(telefone: string | null | undefined, mensagem?: string) {
  let digitos = String(telefone ?? "").replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (!/^55\d{10,11}$/.test(digitos)) return null;
  return `https://wa.me/${digitos}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
}

export function mensagemFollowup(nome: string | null | undefined, peca: string) {
  const primeiroNome = nome?.trim().split(/\s+/)[0];
  return `Olá${primeiroNome ? `, ${primeiroNome}` : ""}! Tudo bem? Passando para saber se você conseguiu ver o orçamento de "${peca}". Posso ajudar com alguma dúvida?`;
}

export const DIA_MS = 24 * 60 * 60 * 1000;

/** Enviado há mais de `dias` sem resposta. */
export function precisaFollowup(o: { status: StatusOrcamento; status_alterado_em: string }, dias: number, agora = Date.now()) {
  return o.status === "enviado" && agora - new Date(o.status_alterado_em).getTime() > dias * DIA_MS;
}

/** Texto sem acentos e em minúsculas, para busca ("impressao" encontra "Impressão"). */
export function normalizarBusca(texto: string | null | undefined) {
  return (texto ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Indicadores do histórico para a lista filtrada. Aprovação = (aprovados + entregues) ÷ (todos exceto enviados). */
export function indicadores(lista: { status: StatusOrcamento; preco: number; lucro: number }[]) {
  const fechados = lista.filter((o) => o.status === "aprovado" || o.status === "entregue");
  const decididos = lista.filter((o) => o.status !== "enviado");
  return {
    quantidade: lista.length,
    taxaAprovacao: decididos.length ? fechados.length / decididos.length : null,
    valorFechado: fechados.reduce((s, o) => s + o.preco, 0),
    lucroEstimado: fechados.reduce((s, o) => s + o.lucro, 0),
  };
}
