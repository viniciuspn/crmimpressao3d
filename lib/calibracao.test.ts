import { describe, expect, it } from "vitest";
import { calibrar, type Entrega } from "./calibracao";
import { resumirPorCliente } from "./clientes";

const entrega = (e: Partial<Entrega> = {}): Entrega => ({
  horasEstimadas: 10,
  horasReais: 10,
  gramasEstimadas: 100,
  gramasReais: 100,
  houveFalha: false,
  mesas: 1,
  desperdicioUsado: 5,
  taxaFalhaUsada: 8,
  ...e,
});
const varias = (n: number, e: Partial<Entrega> = {}) => [...Array(n)].map(() => entrega(e));

describe("calibrar", () => {
  it("sem entregas: tudo vazio e nenhuma sugestão", () => {
    expect(calibrar([], 8, 5)).toMatchObject({
      entregas: 0,
      desvioHoras: null,
      desvioGramas: null,
      taxaFalhaReal: null,
      taxaFalhaSugerida: null,
      desperdicioSugerido: null,
    });
  });

  it("desvio é a razão das somas (um trabalho pequeno não distorce)", () => {
    const r = calibrar(
      [...varias(4, { gramasEstimadas: 200, gramasReais: 200 }), entrega({ gramasEstimadas: 5, gramasReais: 15 })],
      8,
      5,
    );
    // (800 + 15) / (800 + 5) − 1 ≈ 1,2% (a média das razões daria +40%)
    expect(r.desvioGramas).toBeCloseTo(815 / 805 - 1, 10);
  });

  it("ignora reais zerados e entregas sem o dado", () => {
    const r = calibrar([entrega({ horasReais: 0 }), entrega({ horasReais: null }), entrega({ horasReais: 12 })], 8, 5);
    expect(r.comHoras).toBe(1);
    expect(r.desvioHoras).toBeCloseTo(0.2, 10);
  });

  it("entregas com falha não entram no desperdício nem nos desvios", () => {
    const lista = [...varias(5), entrega({ houveFalha: true, gramasReais: 200, horasReais: 20 })];
    const r = calibrar(lista, 8, 5);
    expect(r.desvioGramas).toBe(0);
    expect(r.desvioHoras).toBe(0);
    expect(r.desperdicioSugerido).toBeNull(); // continua 5%
  });

  it("taxa real é falhas ÷ mesas", () => {
    const r = calibrar([entrega({ mesas: 4, houveFalha: true }), entrega({ mesas: 4 })], 8, 5);
    expect(r.taxaFalhaReal).toBeCloseTo(1 / 8, 10);
  });

  it("falha só conta em entregas registradas de verdade (com horas ou gramas reais)", () => {
    const r = calibrar([entrega(), entrega({ horasReais: null, gramasReais: null, houveFalha: true })], 8, 5);
    expect(r.comFalha).toBe(1);
    expect(r.falhas).toBe(0);
  });

  it("não sugere com menos de 5 entregas", () => {
    expect(calibrar([entrega({ houveFalha: true }), entrega(), entrega()], 8, 5).taxaFalhaSugerida).toBeNull();
  });

  it("sugere a taxa misturando o real com a taxa usada nos orçamentos (peso 10 mesas)", () => {
    // 2 falhas em 10 mesas, taxa usada 8% → (2 + 0,8) / 20 = 14%
    const lista = [...varias(8), ...varias(2, { houveFalha: true })];
    expect(calibrar(lista, 8, 5).taxaFalhaSugerida).toBe(14);
  });

  it("é estável: depois de aplicar, não sugere de novo (a base não é a configuração)", () => {
    const lista = [...varias(8), ...varias(2, { houveFalha: true })];
    const r = calibrar(lista, 14, 5);
    expect(r.taxaFalhaCalculada).toBe(14);
    expect(r.taxaFalhaSugerida).toBeNull();
  });

  it("ignora diferenças menores que 0,5 ponto", () => {
    const lista = varias(5, { gramasReais: 100.4 }); // 1,05 × 1,004 − 1 ≈ 5,4%
    expect(calibrar(lista, 8, 5).desperdicioCalculado).toBe(5.4);
    expect(calibrar(lista, 8, 5).desperdicioSugerido).toBeNull();
  });

  it("sugere o desperdício que teria acertado as gramas, entre 0 e 100%", () => {
    expect(calibrar(varias(5, { gramasReais: 110 }), 8, 5).desperdicioSugerido).toBe(15.5); // 1,05 × 1,1 − 1
    expect(calibrar(varias(5, { gramasReais: 50 }), 8, 5).desperdicioSugerido).toBe(0);
    expect(calibrar(varias(5, { gramasReais: 1000 }), 8, 5).desperdicioSugerido).toBe(100);
  });

  it("desperdício sugerido com desperdício usado diferente entre orçamentos é a razão das somas das bases", () => {
    // Bases de 100 g: com 0% estimou 100 g e gastou 150 g; com 100% estimou 200 g e gastou 110 g.
    const lista = [
      ...varias(4, { gramasEstimadas: 100, gramasReais: 150, desperdicioUsado: 0 }),
      entrega({ gramasEstimadas: 200, gramasReais: 110, desperdicioUsado: 100 }),
    ];
    // (4 × 150 + 110) ÷ (4 × 100 + 100) − 1 = 42%
    expect(calibrar(lista, 8, 5).desperdicioCalculado).toBe(42);
  });
});

describe("resumirPorCliente", () => {
  it("conta orçamentos, fechados e valor fechado; ignora sem cliente", () => {
    const r = resumirPorCliente([
      { cliente_id: "a", status: "enviado", preco: 10 },
      { cliente_id: "a", status: "aprovado", preco: 20 },
      { cliente_id: "a", status: "entregue", preco: 30 },
      { cliente_id: "b", status: "recusado", preco: 40 },
      { cliente_id: null, status: "aprovado", preco: 99 },
    ]);
    expect(r.get("a")).toEqual({ orcamentos: 3, fechados: 2, valorFechado: 50 });
    expect(r.get("b")).toEqual({ orcamentos: 1, fechados: 0, valorFechado: 0 });
    expect(r.size).toBe(2);
  });
});
