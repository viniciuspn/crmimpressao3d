import { describe, expect, it } from "vitest";
import {
  entradaOrcamentoSchema,
  indicadores,
  linkWhatsApp,
  mensagemFollowup,
  precisaFollowup,
  rotuloMaterial,
  textoOrcamento,
} from "./orcamento";

describe("textoOrcamento", () => {
  it("segue o formato da spec", () => {
    expect(
      textoOrcamento({
        peca: "Suporte de headset",
        cliente: "Ana Souza",
        material: "PLA",
        pintado: false,
        quantidade: 3,
        horas: 7,
        preco: 83.37,
        validadeDias: 7,
      }).replace(/ /g, " "), // Intl usa espaço não separável depois de "R$"
    ).toBe(
      [
        "*Orçamento — Suporte de headset*",
        "Cliente: Ana Souza",
        "Material: PLA",
        "Acabamento: sem pintura",
        "Quantidade: 3 peça(s)",
        "Tempo de produção: ~7 h de impressão",
        "",
        "Valor por peça: R$ 27,79",
        "*Total: R$ 83,37*",
        "",
        "Orçamento válido por 7 dias.",
      ].join("\n").replace(/ /g, " "),
    );
  });

  it("sem cliente omite a linha, arredonda as horas para cima e diz pintado", () => {
    const t = textoOrcamento({
      peca: "",
      material: "PETG",
      pintado: true,
      quantidade: 1,
      horas: 2.1,
      preco: 30,
      validadeDias: 10,
    });
    expect(t).not.toContain("Cliente:");
    expect(t).toContain("*Orçamento — Impressão 3D*");
    expect(t).toContain("~3 h de impressão");
    expect(t).toContain("Acabamento: pintado");
    expect(t).toContain("válido por 10 dias");
  });
});

describe("linkWhatsApp", () => {
  it.each([
    ["(31) 99999-0000", "https://wa.me/5531999990000"],
    ["31 3333-4444", "https://wa.me/553133334444"],
    ["+55 31 99999-0000", "https://wa.me/5531999990000"],
  ])("%s", (tel, link) => {
    expect(linkWhatsApp(tel)).toBe(link);
  });

  it("sem DDD ou vazio não gera link", () => {
    expect(linkWhatsApp("99999-0000")).toBeNull();
    expect(linkWhatsApp("")).toBeNull();
    expect(linkWhatsApp(null)).toBeNull();
  });

  it("codifica a mensagem", () => {
    expect(linkWhatsApp("31999990000", "Olá & tudo?")).toBe("https://wa.me/5531999990000?text=Ol%C3%A1%20%26%20tudo%3F");
  });

  it("mensagem de follow-up usa o primeiro nome", () => {
    expect(mensagemFollowup("Ana Souza", "Vaso")).toMatch(/^Olá, Ana! .*"Vaso"/);
    expect(mensagemFollowup(null, "Vaso")).toMatch(/^Olá! /);
  });
});

describe("follow-up e indicadores", () => {
  const agora = new Date("2026-10-20T12:00:00Z").getTime();

  it("destaca enviados há mais de N dias", () => {
    expect(precisaFollowup({ status: "enviado", status_alterado_em: "2026-10-12T12:00:00Z" }, 7, agora)).toBe(true);
    expect(precisaFollowup({ status: "enviado", status_alterado_em: "2026-10-15T12:00:00Z" }, 7, agora)).toBe(false);
    expect(precisaFollowup({ status: "aprovado", status_alterado_em: "2026-01-01T00:00:00Z" }, 7, agora)).toBe(false);
  });

  it("aprovação = (aprovados + entregues) ÷ todos exceto enviados", () => {
    const r = indicadores([
      { status: "enviado", preco: 100, lucro: 40 },
      { status: "aprovado", preco: 200, lucro: 80 },
      { status: "entregue", preco: 50, lucro: 20 },
      { status: "recusado", preco: 300, lucro: 100 },
    ]);
    expect(r).toEqual({ quantidade: 4, taxaAprovacao: 2 / 3, valorFechado: 250, lucroEstimado: 100 });
    expect(indicadores([{ status: "enviado", preco: 1, lucro: 1 }]).taxaAprovacao).toBeNull();
  });
});

describe("entradaOrcamentoSchema", () => {
  const base = {
    cliente_id: null,
    peca: "Vaso",
    filamento: { tipo: "generico", nome: "PLA" },
    impressora_id: null,
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
    extras_peca: 0,
    embalagem_pedido: 3,
    insumos: [],
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

  it("aceita o caso A e descarta campos extras (ex.: preço enviado pelo navegador)", () => {
    const r = entradaOrcamentoSchema.safeParse({ ...base, preco: 1 });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty("preco");
  });

  it.each([
    ["taxa de 100%", { taxa_pagamento_pct: 100 }],
    ["quantidade quebrada", { quantidade: 1.5 }],
    ["NaN", { gramas_por_mesa: Number.NaN }],
    ["filamento genérico desconhecido", { filamento: { tipo: "generico", nome: "Ouro" } }],
    ["peça vazia", { peca: "  " }],
    ["linha de insumo com quantidade 0", { insumos: [{ insumo_id: null, nome: "x", unidade: "un", custo_unitario: 1, quantidade: 0, base: "peca" }] }],
  ])("recusa %s", (_, extra) => {
    expect(entradaOrcamentoSchema.safeParse({ ...base, ...extra }).success).toBe(false);
  });
});

describe("rotuloMaterial", () => {
  it("acrescenta o tipo quando o nome não o menciona", () => {
    expect(rotuloMaterial({ nome: "Preto Voolt", tipo: "PETG" })).toBe("Preto Voolt (PETG)");
    expect(rotuloMaterial({ nome: "PLA Preto", tipo: "PLA" })).toBe("PLA Preto");
    expect(rotuloMaterial(null, "PLA")).toBe("PLA");
  });
});
