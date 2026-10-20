import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ABAS_EXPORTACAO, gerarPlanilha } from "./exportar";

describe("gerarPlanilha", () => {
  it("cria uma aba por tabela, com cabeçalho, valores e jsonb como texto", async () => {
    const buffer = await gerarPlanilha({
      configuracoes: [{ id: "c1", margem_pct: 80, retorno_ativo: false }],
      clientes: [{ id: "a", nome: "Ana", telefone: null }],
      filamentos: [],
      impressoras: [{ id: "i", nome: "K1C", preco: 3000 }],
      insumos: [],
      orcamentos: [{ id: "o", peca: "Vaso", preco: 83.37, parametros: { versao: 1, entrada: { quantidade: 3 } } }],
      orcamento_insumos: [],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(ABAS_EXPORTACAO.map((a) => a.nome));

    const orc = wb.getWorksheet("Orçamentos")!;
    expect(orc.getRow(1).values).toEqual([undefined, "id", "peca", "preco", "parametros"]);
    expect(orc.getRow(2).getCell(3).value).toBe(83.37);
    expect(JSON.parse(String(orc.getRow(2).getCell(4).value))).toEqual({ versao: 1, entrada: { quantidade: 3 } });

    const cli = wb.getWorksheet("Clientes")!;
    expect(cli.getRow(2).getCell(2).value).toBe("Ana");
    expect(cli.getRow(2).getCell(3).value).toBeNull();

    expect(wb.getWorksheet("Filamentos")!.getRow(1).getCell(1).value).toBe("(vazio)");
    expect(wb.getWorksheet("Configurações")!.getRow(2).getCell(3).value).toBe(false);
  });

  it("texto que parece fórmula continua texto (sem injeção de fórmula)", async () => {
    const vazio = { configuracoes: [], filamentos: [], impressoras: [], insumos: [], orcamentos: [], orcamento_insumos: [] };
    const nomes = ['=HYPERLINK("http://x","clique")', "+1+1", "-2", "@SOMA(A1)"];
    const buffer = await gerarPlanilha({ ...vazio, clientes: nomes.map((nome, i) => ({ id: String(i), nome })) });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Clientes")!;
    nomes.forEach((nome, i) => {
      const cel = ws.getRow(i + 2).getCell(2);
      expect(cel.type).toBe(ExcelJS.ValueType.String);
      expect(cel.value).toBe(nome);
    });
  });
});
