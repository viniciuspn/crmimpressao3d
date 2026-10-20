import ExcelJS from "exceljs";

/** Uma aba por tabela, nesta ordem. */
export const ABAS_EXPORTACAO = [
  { tabela: "configuracoes", nome: "Configurações" },
  { tabela: "clientes", nome: "Clientes" },
  { tabela: "filamentos", nome: "Filamentos" },
  { tabela: "impressoras", nome: "Impressoras" },
  { tabela: "insumos", nome: "Insumos" },
  { tabela: "orcamentos", nome: "Orçamentos" },
  { tabela: "orcamento_insumos", nome: "Insumos dos orçamentos" },
] as const;
export type TabelaExportada = (typeof ABAS_EXPORTACAO)[number]["tabela"];

type Linha = Record<string, unknown>;

/** Valor de célula: objetos (jsonb) viram JSON; o resto vai como está. */
function celula(valor: unknown): ExcelJS.CellValue {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "object") return JSON.stringify(valor);
  return valor as ExcelJS.CellValue;
}

export async function gerarPlanilha(dados: Record<TabelaExportada, Linha[]>, geradoEm = new Date()): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ideia";
  wb.created = geradoEm;

  for (const { tabela, nome } of ABAS_EXPORTACAO) {
    const linhas = dados[tabela] ?? [];
    const ws = wb.addWorksheet(nome, { views: [{ state: "frozen", ySplit: 1 }] });
    const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l)))];
    if (colunas.length === 0) {
      ws.addRow(["(vazio)"]);
      continue;
    }
    ws.columns = colunas.map((c) => ({ header: c, key: c, width: Math.min(40, Math.max(12, c.length + 2)) }));
    for (const l of linhas) ws.addRow(Object.fromEntries(colunas.map((c) => [c, celula(l[c])])));
    ws.getRow(1).font = { bold: true };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colunas.length } };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
