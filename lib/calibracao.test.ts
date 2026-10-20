import { describe, expect, it } from "vitest";
import { calibrar, type Entrega } from "./calibracao";
import { resumirPorCliente } from "./clientes";

const entrega = (e: Partial<Entrega> = {}): Entrega => ({
  horasEstimadas: 10,
  horasReais: 10,
  gramasEstimadas: 100,
  gramasReais: 100,
  houveFalha: false,
  desperdicioUsado: 5,
  ...e,
});

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

  it("calcula desvios médios e ignora entregas sem o dado", () => {
    const r = calibrar(
      [entrega({ horasReais: 11 }), entrega({ horasReais: 12 }), entrega({ horasReais: null, gramasReais: 120 })],
      8,
      5,
    );
    expect(r.comHoras).toBe(2);
    expect(r.desvioHoras).toBeCloseTo(0.15, 10); // (10% + 20%) / 2
    expect(r.desvioGramas).toBeCloseTo(0.2 / 3, 10); // (0 + 0 + 20%) / 3
  });

  it("não sugere com menos de 5 entregas", () => {
    const r = calibrar([entrega({ houveFalha: true }), entrega(), entrega()], 8, 5);
    expect(r.taxaFalhaReal).toBeCloseTo(1 / 3, 10);
    expect(r.taxaFalhaSugerida).toBeNull();
  });

  it("sugere a taxa de falha misturando o observado com a atual (peso 10)", () => {
    // 2 falhas em 10, taxa atual 8% → (2 + 0,8) / 20 = 14%
    const lista = [...Array(8)].map(() => entrega()).concat([entrega({ houveFalha: true }), entrega({ houveFalha: true })]);
    expect(calibrar(lista, 8, 5).taxaFalhaSugerida).toBe(14);
  });

  it("não sugere a mesma taxa que já está configurada", () => {
    // 4 falhas em 10, atual 40% → 40%
    const lista = [...Array(6)].map(() => entrega()).concat([...Array(4)].map(() => entrega({ houveFalha: true })));
    expect(calibrar(lista, 40, 5).taxaFalhaSugerida).toBeNull();
  });

  it("sugere o desperdício que teria acertado as gramas", () => {
    // usou 5%, real 10% acima do estimado → 1,05 × 1,1 − 1 = 15,5%
    const lista = [...Array(5)].map(() => entrega({ gramasReais: 110 }));
    expect(calibrar(lista, 8, 5).desperdicioSugerido).toBe(15.5);
  });

  it("desperdício sugerido nunca fica negativo", () => {
    const lista = [...Array(5)].map(() => entrega({ gramasReais: 50 }));
    expect(calibrar(lista, 8, 5).desperdicioSugerido).toBe(0);
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
