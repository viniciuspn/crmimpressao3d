// Regra de cálculo do orçamento (seção 3 da spec). Função pura: sem banco, sem I/O.
// Usada no navegador (atualização ao vivo) e no servidor (valor gravado, sempre recalculado).
// Tudo em precisão total; arredonde só ao exibir ou gravar (arredondar2).

import type { BaseInsumo } from "@/lib/dominio";

export type LinhaInsumo = {
  custo_unitario: number;
  quantidade: number;
  base: BaseInsumo;
};

/** Percentuais em pontos percentuais (5 = 5%). */
export type EntradaCalculo = {
  // Trabalho
  quantidade: number;
  pecas_por_mesa: number;
  gramas_por_mesa: number;
  horas_por_mesa: number;
  // Material
  preco_kg: number;
  desperdicio_pct: number;
  // Máquina
  preco_impressora: number;
  vida_util_h: number;
  consumo_w: number;
  manutencao_h: number;
  tarifa_kwh: number;
  taxa_falha_pct: number;
  // Mão de obra
  valor_hora: number;
  preparo_min: number;
  acabamento_min_peca: number;
  // Insumos do pedido
  insumos: LinhaInsumo[];
  /** Outros extras avulsos, em R$ por peça (como no protótipo). */
  extras_peca: number;
  embalagem_pedido: number;
  // Pintura
  pintado: boolean;
  pintura_insumos_peca: number;
  pintura_min_peca: number;
  // Retorno da máquina
  retorno_ativo: boolean;
  retorno_meses: number;
  retorno_horas_mes: number;
  // Preço
  margem_pct: number;
  taxa_pagamento_pct: number;
  pedido_minimo: number;
};

export const COMPONENTES_CUSTO = [
  "material",
  "energia",
  "depreciacao",
  "manutencao",
  "falhas",
  "mao_de_obra",
  "insumos",
  "pintura",
] as const;
export type ComponenteCusto = (typeof COMPONENTES_CUSTO)[number];

export type ResultadoCalculo = {
  mesas: number;
  gramas: number;
  horas: number;
  componentes: Record<ComponenteCusto, number>;
  /** Pintura separada em material e mão de obra (para o "seu R$/hora"). */
  pintura_insumos: number;
  pintura_mao_de_obra: number;
  custo_total: number;
  deprec_h: number;
  meta_h: number;
  retorno: number;
  preco: number;
  preco_por_peca: number;
  lucro: number;
  /** lucro ÷ preço (quanto do que o cliente paga fica com você); null se o preço for 0. */
  margem_real: number | null;
  /** Minutos de preparo, acabamento e pintura, em horas. Sem horas de impressão. */
  horas_trabalhadas: number;
  /** (mão de obra + mão de obra da pintura + lucro) ÷ horas trabalhadas; null se não houver horas. */
  valor_hora_real: number | null;
  avisos: {
    pedido_minimo_aplicado: boolean;
    mao_de_obra_alta: boolean;
  };
};

const pct = (valor: number) => valor / 100;

export function calcular(e: EntradaCalculo): ResultadoCalculo {
  for (const [campo, valor] of Object.entries(e)) {
    if (typeof valor === "number" && (!Number.isFinite(valor) || valor < 0)) {
      throw new RangeError(`${campo} deve ser um número ≥ 0`);
    }
  }
  for (const l of e.insumos) {
    if (!Number.isFinite(l.custo_unitario) || l.custo_unitario < 0 || !Number.isFinite(l.quantidade) || l.quantidade < 0) {
      throw new RangeError("linha de insumo com custo ou quantidade inválidos");
    }
  }
  if (!Number.isInteger(e.quantidade) || e.quantidade < 1) {
    throw new RangeError("quantidade deve ser um inteiro ≥ 1");
  }
  if (!Number.isInteger(e.pecas_por_mesa) || e.pecas_por_mesa < 1) {
    throw new RangeError("pecas_por_mesa deve ser um inteiro ≥ 1");
  }
  if (e.vida_util_h <= 0) throw new RangeError("vida_util_h deve ser > 0");
  if (e.taxa_pagamento_pct < 0 || e.taxa_pagamento_pct >= 100) {
    throw new RangeError("taxa_pagamento_pct deve estar entre 0 e 100 (exclusive)");
  }
  if (e.retorno_ativo && (e.retorno_meses <= 0 || e.retorno_horas_mes <= 0)) {
    throw new RangeError("retorno_meses e retorno_horas_mes devem ser > 0");
  }

  const mesas = Math.ceil(e.quantidade / e.pecas_por_mesa);
  const gramas = e.gramas_por_mesa * mesas * (1 + pct(e.desperdicio_pct));
  const horas = e.horas_por_mesa * mesas;

  const material = (gramas / 1000) * e.preco_kg;
  const energia = ((horas * e.consumo_w) / 1000) * e.tarifa_kwh;
  const deprec_h = e.preco_impressora / e.vida_util_h;
  const depreciacao = horas * deprec_h;
  const manutencao = horas * e.manutencao_h;
  const falhas = (material + energia + depreciacao + manutencao) * pct(e.taxa_falha_pct);
  const mao_de_obra = ((e.preparo_min + e.acabamento_min_peca * e.quantidade) / 60) * e.valor_hora;

  const insumos =
    e.insumos.reduce(
      (soma, l) => soma + l.custo_unitario * l.quantidade * (l.base === "peca" ? e.quantidade : 1),
      0,
    ) +
    e.extras_peca * e.quantidade +
    e.embalagem_pedido;

  const pintura_insumos = e.pintado ? e.pintura_insumos_peca * e.quantidade : 0;
  const pintura_min = e.pintado ? e.pintura_min_peca * e.quantidade : 0;
  const pintura_mao_de_obra = (pintura_min / 60) * e.valor_hora;
  const pintura = pintura_insumos + pintura_mao_de_obra;

  const custo_total =
    material + energia + depreciacao + manutencao + falhas + mao_de_obra + insumos + pintura;

  // Retorno entra no preço, não no custo, e não recebe margem.
  const meta_h = e.retorno_ativo ? e.preco_impressora / (e.retorno_meses * e.retorno_horas_mes) : 0;
  const retorno = Math.max(0, meta_h - deprec_h) * horas;

  const liquido = 1 - pct(e.taxa_pagamento_pct);
  const preco_calculado = (custo_total * (1 + pct(e.margem_pct)) + retorno) / liquido;
  const preco = Math.max(preco_calculado, e.pedido_minimo);
  const lucro = preco * liquido - custo_total;

  const horas_trabalhadas =
    (e.preparo_min + e.acabamento_min_peca * e.quantidade + pintura_min) / 60;

  return {
    mesas,
    gramas,
    horas,
    componentes: { material, energia, depreciacao, manutencao, falhas, mao_de_obra, insumos, pintura },
    pintura_insumos,
    pintura_mao_de_obra,
    custo_total,
    deprec_h,
    meta_h,
    retorno,
    preco,
    preco_por_peca: preco / e.quantidade,
    lucro,
    margem_real: preco > 0 ? lucro / preco : null,
    horas_trabalhadas,
    valor_hora_real:
      horas_trabalhadas > 0 ? (mao_de_obra + pintura_mao_de_obra + lucro) / horas_trabalhadas : null,
    avisos: {
      pedido_minimo_aplicado: preco_calculado < e.pedido_minimo,
      mao_de_obra_alta: mao_de_obra > 3 * material,
    },
  };
}

/** Preço por kg do filamento: (preço do rolo + frete) ÷ peso do rolo em kg. */
export function precoPorKg(f: { preco_rolo: number; frete: number; peso_rolo_g: number }) {
  return (f.preco_rolo + f.frete) / (f.peso_rolo_g / 1000);
}

/** Custo por unidade do insumo; null se a quantidade por embalagem não foi preenchida. */
export function custoPorUnidade(i: { preco_pago: number; qtd_embalagem: number | null }) {
  return i.qtd_embalagem && i.qtd_embalagem > 0 ? i.preco_pago / i.qtd_embalagem : null;
}

/**
 * Arredonda a 2 casas, meio para longe do zero (1.005 → 1.01, -1.005 → -1.01).
 * toPrecision(15) descarta o ruído de ponto flutuante (1.005 * 100 = 100.49999…).
 */
export function arredondar2(valor: number) {
  const centavos = Math.round(Number((Math.abs(valor) * 100).toPrecision(15)));
  return (valor < 0 && centavos !== 0 ? -centavos : centavos) / 100;
}
