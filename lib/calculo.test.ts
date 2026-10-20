import { describe, expect, it } from "vitest";
import {
  arredondar2,
  calcular,
  COMPONENTES_CUSTO,
  custoPorUnidade,
  precoPorKg,
  type EntradaCalculo,
} from "./calculo";

// Caso A da spec (seção 3).
const CASO_A: EntradaCalculo = {
  quantidade: 3,
  pecas_por_mesa: 2,
  gramas_por_mesa: 48,
  horas_por_mesa: 3.5,
  preco_kg: 110,
  desperdicio_pct: 5,
  preco_impressora: 3200,
  vida_util_h: 6000,
  consumo_w: 120,
  manutencao_h: 0.4,
  tarifa_kwh: 1.05,
  taxa_falha_pct: 8,
  valor_hora: 40,
  preparo_min: 20,
  acabamento_min_peca: 5,
  insumos: [],
  extras_avulsos: 0,
  embalagem_pedido: 3,
  pintado: false,
  pintura_insumos_peca: 0,
  pintura_min_peca: 0,
  retorno_ativo: false,
  retorno_meses: 12,
  retorno_horas_mes: 160,
  margem_pct: 80,
  taxa_pagamento_pct: 0,
  pedido_minimo: 30,
};

const CASO_B: EntradaCalculo = {
  ...CASO_A,
  pintado: true,
  pintura_insumos_peca: 12,
  pintura_min_peca: 15,
  retorno_ativo: true,
  taxa_pagamento_pct: 5,
};

const CASO_C: EntradaCalculo = {
  ...CASO_A,
  quantidade: 1,
  pecas_por_mesa: 1,
  gramas_por_mesa: 5,
  horas_por_mesa: 0.5,
  preparo_min: 5,
  acabamento_min_peca: 0,
  embalagem_pedido: 0,
};

/** Valores esperados da tabela da spec, comparados após arredondar a 2 casas. */
function confere(valor: number, esperado: number) {
  expect(arredondar2(valor)).toBe(esperado);
}

describe("casos obrigatórios da spec", () => {
  it("A — padrão", () => {
    const r = calcular(CASO_A);
    expect(r.mesas).toBe(2);
    confere(r.gramas, 100.8);
    confere(r.componentes.material, 11.09);
    confere(r.componentes.energia, 0.88);
    confere(r.componentes.depreciacao, 3.73);
    confere(r.componentes.manutencao, 2.8);
    confere(r.componentes.falhas, 1.48);
    confere(r.componentes.mao_de_obra, 23.33);
    confere(r.custo_total, 46.32);
    confere(r.preco, 83.37);
    confere(r.lucro, 37.05);
    expect(r.avisos.pedido_minimo_aplicado).toBe(false);
  });

  it("B — pintura + retorno + taxa", () => {
    const r = calcular(CASO_B);
    confere(r.componentes.pintura, 66);
    confere(r.custo_total, 112.32);
    confere(r.retorno, 7.93);
    confere(r.preco, 221.16);
    confere(r.lucro, 97.79);
  });

  it("C — pedido mínimo", () => {
    const r = calcular(CASO_C);
    confere(r.custo_total, 4.53);
    confere(r.preco, 30);
    confere(r.lucro, 25.47);
    expect(r.avisos.pedido_minimo_aplicado).toBe(true);
  });
});

describe("regras", () => {
  it("custo total é a soma exata dos componentes", () => {
    for (const caso of [CASO_A, CASO_B, CASO_C]) {
      const r = calcular(caso);
      const soma = COMPONENTES_CUSTO.reduce((s, c) => s + r.componentes[c], 0);
      expect(r.custo_total).toBeCloseTo(soma, 10);
    }
  });

  it("arredonda mesas para cima", () => {
    expect(calcular({ ...CASO_A, quantidade: 5, pecas_por_mesa: 2 }).mesas).toBe(3);
    expect(calcular({ ...CASO_A, quantidade: 4, pecas_por_mesa: 2 }).mesas).toBe(2);
  });

  it("insumo por peça multiplica pela quantidade; por pedido, não", () => {
    const base = calcular(CASO_A).componentes.insumos; // só embalagem: 3
    const r = calcular({
      ...CASO_A,
      insumos: [
        { custo_unitario: 0.5, quantidade: 2, base: "peca" }, // 0,5 × 2 × 3 = 3
        { custo_unitario: 1.25, quantidade: 4, base: "pedido" }, // 1,25 × 4 = 5
      ],
      extras_avulsos: 2,
    });
    expect(r.componentes.insumos - base).toBeCloseTo(3 + 5 + 2, 10);
  });

  it("falha incide só sobre material, energia, depreciação e manutenção", () => {
    const sem = calcular(CASO_A);
    const com = calcular({ ...CASO_A, extras_avulsos: 100 });
    expect(com.componentes.falhas).toBe(sem.componentes.falhas);
  });

  it("retorno é zero quando a meta por hora fica abaixo da depreciação", () => {
    // meta = 3200 / (120 × 160) = 0,1667/h < depreciação 0,5333/h
    const r = calcular({ ...CASO_A, retorno_ativo: true, retorno_meses: 120, retorno_horas_mes: 160 });
    expect(r.meta_h).toBeGreaterThan(0);
    expect(r.retorno).toBe(0);
  });

  it("retorno não recebe margem e não entra no custo", () => {
    const sem = calcular({ ...CASO_A, pedido_minimo: 0 });
    const com = calcular({ ...CASO_A, pedido_minimo: 0, retorno_ativo: true });
    expect(com.custo_total).toBe(sem.custo_total);
    expect(com.preco - sem.preco).toBeCloseTo(com.retorno, 10);
  });

  it("retorno desligado ignora meses e horas", () => {
    const r = calcular({ ...CASO_A, retorno_meses: 0, retorno_horas_mes: 0 });
    expect(r.meta_h).toBe(0);
    expect(r.retorno).toBe(0);
  });

  it("pintura desligada não cobra nada, mesmo com valores preenchidos", () => {
    const r = calcular({ ...CASO_A, pintura_insumos_peca: 12, pintura_min_peca: 15 });
    expect(r.componentes.pintura).toBe(0);
    expect(r.horas_trabalhadas).toBeCloseTo(35 / 60, 10);
  });

  it("lucro desconta a taxa de pagamento", () => {
    const r = calcular(CASO_B);
    expect(r.lucro).toBeCloseTo(r.preco * 0.95 - r.custo_total, 10);
  });

  it("preço por peça, margem real e seu R$/hora", () => {
    const r = calcular(CASO_B);
    expect(r.preco_por_peca).toBeCloseTo(r.preco / 3, 10);
    expect(r.margem_real).toBeCloseTo(r.lucro / r.custo_total, 10);
    // horas trabalhadas: (20 + 5×3 + 15×3) / 60 = 80 min
    expect(r.horas_trabalhadas).toBeCloseTo(80 / 60, 10);
    // mão de obra 23,33 + pintura (mão de obra) 30 + lucro
    expect(r.valor_hora_real).toBeCloseTo((r.componentes.mao_de_obra + 30 + r.lucro) / (80 / 60), 10);
  });

  it("seu R$/hora é null sem horas trabalhadas", () => {
    expect(calcular({ ...CASO_C, preparo_min: 0 }).valor_hora_real).toBeNull();
  });

  it("avisa quando a mão de obra passa de 3× o filamento", () => {
    expect(calcular(CASO_A).avisos.mao_de_obra_alta).toBe(false); // 23,33 < 33,26
    expect(calcular({ ...CASO_A, preparo_min: 40 }).avisos.mao_de_obra_alta).toBe(true); // 36,67
  });

  it("margem real é igual à configurada sem taxa nem pedido mínimo", () => {
    expect(calcular(CASO_A).margem_real).toBeCloseTo(0.8, 10);
    expect(calcular(CASO_B).margem_real).toBeLessThan(1); // retorno + taxa mudam a conta
  });

  it("rejeita NaN, infinito e negativos (campos vazios no cálculo ao vivo)", () => {
    expect(() => calcular({ ...CASO_A, gramas_por_mesa: Number.NaN })).toThrow(RangeError);
    expect(() => calcular({ ...CASO_A, preco_kg: Number.POSITIVE_INFINITY })).toThrow(RangeError);
    expect(() => calcular({ ...CASO_A, margem_pct: -1 })).toThrow(RangeError);
    expect(() =>
      calcular({ ...CASO_A, insumos: [{ custo_unitario: Number.NaN, quantidade: 1, base: "peca" }] }),
    ).toThrow(RangeError);
  });

  it("rejeita entradas que quebram a fórmula", () => {
    expect(() => calcular({ ...CASO_A, taxa_pagamento_pct: 100 })).toThrow(RangeError);
    expect(() => calcular({ ...CASO_A, pecas_por_mesa: 0 })).toThrow(RangeError);
    expect(() => calcular({ ...CASO_A, quantidade: 0 })).toThrow(RangeError);
    expect(() => calcular({ ...CASO_A, quantidade: 1.5 })).toThrow(RangeError);
    expect(() => calcular({ ...CASO_A, vida_util_h: 0 })).toThrow(RangeError);
    expect(() => calcular({ ...CASO_A, retorno_ativo: true, retorno_meses: 0 })).toThrow(RangeError);
  });

  it("não altera a entrada", () => {
    const entrada = structuredClone(CASO_B);
    calcular(entrada);
    expect(entrada).toEqual(CASO_B);
  });
});

describe("auxiliares", () => {
  it("preço por kg inclui frete e respeita o peso do rolo", () => {
    expect(precoPorKg({ preco_rolo: 110, frete: 0, peso_rolo_g: 1000 })).toBe(110);
    expect(precoPorKg({ preco_rolo: 90, frete: 20, peso_rolo_g: 500 })).toBe(220);
  });

  it("custo por unidade é null sem quantidade por embalagem", () => {
    expect(custoPorUnidade({ preco_pago: 6, qtd_embalagem: null })).toBeNull();
    expect(custoPorUnidade({ preco_pago: 6, qtd_embalagem: 0 })).toBeNull();
    expect(custoPorUnidade({ preco_pago: 6, qtd_embalagem: 7000 })).toBeCloseTo(0.000857, 6);
  });

  it("arredondar2 lida com casos de ponto flutuante", () => {
    expect(arredondar2(1.005)).toBe(1.01);
    expect(arredondar2(2.675)).toBe(2.68);
    expect(arredondar2(-1.005)).toBe(-1.01);
    expect(arredondar2(0.1 + 0.2)).toBe(0.3);
    expect(arredondar2(83.37)).toBe(83.37);
    expect(arredondar2(1e-7)).toBe(0);
    expect(Object.is(arredondar2(-0.004), 0)).toBe(true); // sem "-R$ 0,00"
  });
});
