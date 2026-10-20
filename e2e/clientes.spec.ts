import ExcelJS from "exceljs";
import { expect, test, type Page } from "@playwright/test";
import { preencherCasoA } from "./ajudantes";

const sufixo = Date.now().toString(36);
const nome = `E2E Cliente ${sufixo}`;
const peca = `E2E Peça cliente ${sufixo}`;

const itemCliente = (page: Page) => page.getByTestId("cliente").filter({ hasText: nome });

test.describe.serial("clientes, calibração e exportação", () => {
  test("cadastra cliente com WhatsApp e encontra pela busca sem acento", async ({ page }) => {
    await page.goto("/clientes");
    await page.locator("summary", { hasText: "Novo cliente" }).click();
    await page.getByLabel("Nome").first().fill(nome);
    await page.getByLabel("WhatsApp / telefone").first().fill("(31) 99999-0000");
    await page.getByLabel("Cidade").first().fill("São João");
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(page.getByText("Cliente cadastrado")).toBeVisible();

    await expect(itemCliente(page)).toContainText("Sem orçamentos");
    await page.getByLabel("Buscar cliente").fill("sao joao");
    await expect(itemCliente(page)).toBeVisible();

    await itemCliente(page).locator("summary").click();
    await expect(itemCliente(page).getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/5531999990000");
  });

  test("orçamento do cliente aparece na lista e na página dele", async ({ page }) => {
    await page.goto("/");
    await preencherCasoA(page, peca);
    await page.getByLabel("Cliente", { exact: true }).selectOption({ label: nome });
    await expect(page.getByLabel("Texto do orçamento")).toHaveValue(new RegExp(`Cliente: ${nome}`));
    await page.getByRole("button", { name: "Salvar orçamento" }).click();
    await expect(page.getByText("Orçamento salvo no histórico")).toBeVisible();

    await page.goto("/clientes");
    await expect(itemCliente(page)).toContainText("1 orçamento · 0 fechados");

    await itemCliente(page).locator("summary").click();
    await itemCliente(page).getByRole("link", { name: "Ver histórico" }).click();
    await expect(page.getByRole("heading", { name: nome })).toBeVisible();
    const cartao = page.getByTestId("orcamento").filter({ hasText: peca });
    await expect(cartao).toBeVisible();
    await cartao.getByLabel("Status").selectOption("aprovado");
    await page.waitForResponse((r) => r.request().method() === "POST");

    await page.goto("/clientes");
    await expect(itemCliente(page)).toContainText(/1 fechado · R\$\s83,37/);
  });

  test("exporta o backup .xlsx com uma aba por tabela", async ({ page }) => {
    await page.goto("/configuracoes");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Exportar .xlsx" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^ideia-backup-\d{4}-\d{2}-\d{2}\.xlsx$/);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(await download.path());
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Configurações",
      "Clientes",
      "Filamentos",
      "Impressoras",
      "Insumos",
      "Orçamentos",
      "Insumos dos orçamentos",
    ]);
    const nomes: unknown[] = [];
    wb.getWorksheet("Clientes")!.eachRow((r) => nomes.push(...(r.values as unknown[])));
    expect(nomes).toContain(nome);
  });

  test("relatório de calibração abre", async ({ page }) => {
    await page.goto("/calibracao");
    await expect(page.getByRole("heading", { name: "Relatório de calibração" })).toBeVisible();
    await expect(page.getByText("Entregues", { exact: true })).toBeVisible();
  });

  test("excluir cliente mantém o orçamento no histórico, sem cliente", async ({ page }) => {
    await page.goto("/clientes");
    await itemCliente(page).locator("summary").click();
    await itemCliente(page).getByRole("button", { name: "Excluir" }).click();
    await itemCliente(page).getByRole("button", { name: "Confirmar" }).click();
    await expect(itemCliente(page)).toHaveCount(0);

    await page.goto("/historico");
    const cartao = page.getByTestId("orcamento").filter({ hasText: peca });
    await expect(cartao).toContainText("Sem cliente");

    // Reabrir e atualizar continua funcionando sem o cliente apagado.
    await cartao.getByRole("link", { name: "Abrir" }).click();
    await expect(page.getByLabel("Cliente", { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: "Atualizar orçamento" }).click();
    await expect(page.getByText("Orçamento atualizado")).toBeVisible();
  });
});
