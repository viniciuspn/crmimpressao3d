import { describe, expect, it } from "vitest";
import { configuracoesSchema, filamentoSchema, insumoSchema } from "./cadastros";
import { lerFormulario } from "./form";
import { paraNumero } from "./formato";

function fd(campos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
}

describe("paraNumero", () => {
  it.each([
    ["110", 110],
    ["0,4", 0.4],
    ["0.4", 0.4],
    ["1.234,56", 1234.56],
    [" 3,5 ", 3.5],
    ["-2", -2],
    ["1.000", 1000],
    ["3.200", 3200],
    ["1.234.567", 1234567],
    ["3.5", 3.5],
    ["0.400", 0.4],
  ])("%s → %s", (entrada, esperado) => {
    expect(paraNumero(entrada)).toBe(esperado);
  });

  it("vazio vira undefined e texto vira NaN", () => {
    expect(paraNumero("")).toBeUndefined();
    expect(paraNumero("  ")).toBeUndefined();
    expect(paraNumero("abc")).toBeNaN();
    expect(paraNumero("1,2,3")).toBeNaN();
  });
});

describe("filamentoSchema", () => {
  it("lê o formulário com vírgula, frete vazio e checkbox desmarcado", () => {
    const { dados } = lerFormulario(
      filamentoSchema,
      fd({ nome: " PLA Preto ", tipo: "PLA", marca: "", cor: "#000000", preco_rolo: "99,90", frete: "", peso_rolo_g: "1000" }),
    );
    expect(dados).toEqual({
      nome: "PLA Preto",
      tipo: "PLA",
      marca: null,
      cor: "#000000",
      preco_rolo: 99.9,
      frete: 0,
      peso_rolo_g: 1000,
      ativo: false,
    });
  });

  it("aponta os campos com erro", () => {
    const { erro } = lerFormulario(
      filamentoSchema,
      fd({ nome: "", tipo: "Ouro", preco_rolo: "abc", peso_rolo_g: "0", ativo: "on" }),
    );
    expect(Object.keys(erro?.erros ?? {}).sort()).toEqual(["nome", "peso_rolo_g", "preco_rolo", "tipo"]);
  });
});

describe("limites", () => {
  it("avisa casas decimais demais em vez de deixar o banco arredondar", () => {
    const { erro } = lerFormulario(
      filamentoSchema,
      fd({ nome: "X", tipo: "PLA", preco_rolo: "99,999", peso_rolo_g: "1.000" }),
    );
    expect(Object.keys(erro?.erros ?? {})).toEqual(["preco_rolo"]);
  });

  it("recusa nome gigante", () => {
    const { erro } = lerFormulario(
      filamentoSchema,
      fd({ nome: "x".repeat(121), tipo: "PLA", preco_rolo: "1", peso_rolo_g: "1000" }),
    );
    expect(erro?.erros?.nome).toBeDefined();
  });
});

describe("insumoSchema", () => {
  it("quantidade na embalagem pode ficar vazia, mas não zero", () => {
    expect(
      lerFormulario(insumoSchema, fd({ nome: "Tinta", unidade: "ml", preco_pago: "6", qtd_embalagem: "" })).dados
        ?.qtd_embalagem,
    ).toBeNull();
    expect(
      lerFormulario(insumoSchema, fd({ nome: "Tinta", unidade: "ml", preco_pago: "6", qtd_embalagem: "0" })).erro
        ?.erros?.qtd_embalagem,
    ).toBeDefined();
  });
});

describe("configuracoesSchema", () => {
  const validas = {
    tarifa_kwh: "1,05",
    desperdicio_pct: "5",
    taxa_falha_pct: "8",
    valor_hora: "40",
    preparo_min: "20",
    acabamento_min_peca: "5",
    embalagem_pedido: "3",
    margem_pct: "80",
    taxa_pagamento_pct: "0",
    pedido_minimo: "30",
    pintura_insumos_peca: "0",
    pintura_min_peca: "0",
    retorno_meses: "12",
    retorno_horas_mes: "160",
    validade_orcamento_dias: "7",
    followup_dias: "7",
  };

  it("aceita os padrões", () => {
    expect(lerFormulario(configuracoesSchema, fd(validas)).dados?.retorno_ativo).toBe(false);
  });

  it("recusa taxa de pagamento de 100% (divisão por zero no preço)", () => {
    const { erro } = lerFormulario(configuracoesSchema, fd({ ...validas, taxa_pagamento_pct: "100" }));
    expect(erro?.erros?.taxa_pagamento_pct).toBeDefined();
  });

  it("ignora campos que não são parâmetros (ex.: user_id)", () => {
    const { dados } = lerFormulario(configuracoesSchema, fd({ ...validas, user_id: "outro", dados_iniciais_criados: "false" }));
    expect(dados).not.toHaveProperty("user_id");
    expect(dados).not.toHaveProperty("dados_iniciais_criados");
  });
});
