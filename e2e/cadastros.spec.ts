import { expect, test, type Locator, type Page } from "@playwright/test";

const sufixo = Date.now().toString(36);

test.beforeEach(({ page }) => {
  page.on("dialog", (d) => d.accept());
});

/** Abre o <details> cujo resumo contém o texto e devolve o bloco. */
async function abrir(page: Page, texto: string): Promise<Locator> {
  const bloco = page.locator("details", { has: page.locator("summary", { hasText: texto }) }).first();
  await bloco.locator("summary").click();
  return bloco;
}

test("filamento: cadastrar com vírgula e milhar, erro sem perder o digitado, excluir", async ({ page }) => {
  const nome = `E2E Filamento ${sufixo}`;
  await page.goto("/cadastros?aba=filamentos");

  const novo = await abrir(page, "Novo filamento");
  await novo.getByLabel("Nome").fill(nome);
  await novo.getByLabel("Marca").fill("Teste");
  await novo.getByLabel("Preço do rolo").fill("99,90");
  await novo.getByLabel("Frete").fill("10");
  await novo.getByLabel("Peso do rolo").fill("1.000");
  await novo.getByRole("button", { name: "Cadastrar" }).click();
  await expect(novo.getByRole("status")).toHaveText("Filamento cadastrado");

  // (99,90 + 10) / 1 kg
  const item = page.locator("li", { hasText: nome });
  await expect(item).toContainText("R$ 109,90/kg");
  await expect(item).toContainText("Teste");

  // Erro de validação mantém o que foi digitado nos outros campos.
  const edicao = await abrir(page, nome);
  await edicao.getByLabel("Marca").fill("Marca Nova");
  await edicao.getByLabel("Preço do rolo").fill("abc");
  await edicao.getByRole("button", { name: "Salvar" }).click();
  await expect(edicao.getByText("Informe um número")).toBeVisible();
  await expect(edicao.getByLabel("Marca")).toHaveValue("Marca Nova");
  await expect(edicao.getByLabel("Preço do rolo")).toBeFocused();

  await edicao.getByLabel("Preço do rolo").fill("120");
  await edicao.getByRole("button", { name: "Salvar" }).click();
  await expect(edicao.getByRole("status")).toHaveText("Filamento atualizado");
  await expect(item).toContainText("R$ 130,00/kg");

  await edicao.getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator("li", { hasText: nome })).toHaveCount(0);
});

test("filamento sem cor continua sem cor depois de editar", async ({ page }) => {
  const nome = `E2E Sem Cor ${sufixo}`;
  await page.goto("/cadastros?aba=filamentos");

  const novo = await abrir(page, "Novo filamento");
  await novo.getByLabel("Nome").fill(nome);
  await novo.getByLabel("Preço do rolo").fill("100");
  await expect(novo.getByLabel("Sem cor")).toBeChecked();
  await novo.getByRole("button", { name: "Cadastrar" }).click();
  await expect(novo.getByRole("status")).toHaveText("Filamento cadastrado");

  const edicao = await abrir(page, nome);
  await expect(edicao.getByLabel("Sem cor")).toBeChecked();
  await edicao.getByLabel("Preço do rolo").fill("101");
  await edicao.getByRole("button", { name: "Salvar" }).click();
  await expect(edicao.getByRole("status")).toHaveText("Filamento atualizado");

  await page.reload();
  const depois = await abrir(page, nome);
  await expect(depois.getByLabel("Sem cor")).toBeChecked();
  await depois.getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator("li", { hasText: nome })).toHaveCount(0);
});

test("impressora e insumo: cadastrar e excluir", async ({ page }) => {
  await page.goto("/cadastros?aba=impressoras");
  const impressora = `E2E Impressora ${sufixo}`;
  let novo = await abrir(page, "Nova impressora");
  await novo.getByLabel("Nome").fill(impressora);
  await novo.getByLabel("Preço").fill("3.200");
  await novo.getByLabel("Vida útil").fill("6.000");
  await novo.getByLabel("Consumo médio").fill("120");
  await novo.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.locator("li", { hasText: impressora })).toContainText("depreciação R$ 0,5333/h");
  await (await abrir(page, impressora)).getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator("li", { hasText: impressora })).toHaveCount(0);

  await page.goto("/cadastros?aba=insumos");
  const insumo = `E2E Insumo ${sufixo}`;
  novo = await abrir(page, "Novo insumo");
  await novo.getByLabel("Nome").fill(insumo);
  await novo.getByLabel("Unidade").selectOption("ml");
  await novo.getByLabel("Preço pago").fill("6");
  await novo.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.locator("li", { hasText: insumo })).toContainText("Preencha a quantidade");

  const edicao = await abrir(page, insumo);
  await edicao.getByLabel("Quantidade na embalagem").fill("7.000");
  await edicao.getByRole("button", { name: "Salvar" }).click();
  await expect(page.locator("li", { hasText: insumo })).toContainText("R$ 0,0009/ml");
  await edicao.getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator("li", { hasText: insumo })).toHaveCount(0);
});

test("configurações: recusa taxa de 100% e salva margem", async ({ page }) => {
  await page.goto("/configuracoes");
  const margem = page.getByLabel("Margem");
  const original = await margem.inputValue();

  await page.getByLabel("Taxa de pagamento").fill("100");
  await margem.fill("77");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Deve ser menor que 100")).toBeVisible();
  await expect(margem).toHaveValue("77"); // não perdeu o digitado

  await page.getByLabel("Taxa de pagamento").fill("0");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("status")).toHaveText("Configurações salvas");
  await page.reload();
  await expect(page.getByLabel("Margem")).toHaveValue("77");

  // Restaura o valor original.
  await page.getByLabel("Margem").fill(original);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("status")).toHaveText("Configurações salvas");
});

test("sem sessão, páginas privadas levam ao login", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/cadastros");
  await expect(page).toHaveURL(/\/login$/);
});
