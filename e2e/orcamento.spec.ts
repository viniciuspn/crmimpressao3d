import { expect, test, type Page } from "@playwright/test";

const peca = `E2E Vaso ${Date.now().toString(36)}`;

/** Preenche o caso A da spec com impressora manual, sem depender das configurações salvas. */
async function preencherCasoA(page: Page) {
  const campo = (rotulo: string, valor: string) => page.getByLabel(rotulo, { exact: true }).fill(valor);
  await page.getByLabel("Peça / descrição").fill(peca);
  await page.getByLabel("Impressora", { exact: true }).selectOption({ label: "Manual (preencher abaixo)" });
  await page.getByLabel("Filamento", { exact: true }).selectOption({ label: "PLA (genérico)" });
  await campo("Quantidade de peças", "3");
  await campo("Peças por mesa", "2");
  await campo("Filamento por mesa", "48");
  await campo("Tempo por mesa", "3,5");
  await campo("Preço por kg (com frete)", "110");
  await campo("Desperdício (purga, saia)", "5");
  await campo("Consumo médio", "120");
  await campo("Preço da impressora", "3.200");
  await campo("Vida útil estimada", "6000");
  await campo("Manutenção (bico, mesa, correias)", "0,40");
  await campo("Tarifa de energia", "1,05");
  await campo("Taxa de falha", "8");
  await campo("Valor da sua hora", "40");
  await campo("Preparo (modelar, fatiar, mesa)", "20");
  await campo("Acabamento por peça", "5");
  await campo("Outros extras por peça (avulso)", "0");
  await campo("Embalagem / envio do pedido", "3");
  await campo("Margem sobre o custo", "80");
  await campo("Taxa de pagamento/marketplace", "0");
  await campo("Pedido mínimo", "30");
  await page.getByLabel("Peça com pintura").uncheck();
  await page.getByLabel("Cobrar a mais para pagar a impressora antes da vida útil").uncheck();
}

const cartao = (page: Page) => page.getByTestId("orcamento").filter({ hasText: peca });

test.describe.serial("orçamento → histórico", () => {
  test("monta o caso A, confere o preço e salva", async ({ page }) => {
    await page.goto("/");
    await preencherCasoA(page);

    await expect(page.getByTestId("preco-total")).toHaveText(/R\$\s83,37/);
    const texto = page.getByLabel("Texto do orçamento");
    await expect(texto).toHaveValue(new RegExp(`\\*Orçamento — ${peca}\\*`));
    await expect(texto).toHaveValue(/\*Total: R\$\s83,37\*/);
    await expect(texto).toHaveValue(/~7 h de impressão/);

    // Pintura liga a linha na composição e muda o preço ao vivo.
    await page.getByLabel("Peça com pintura").check();
    await page.getByLabel("Tinta e insumos por peça").fill("12");
    await page.getByLabel("Tempo de pintura por peça").fill("15");
    await expect(page.getByTestId("preco-total")).not.toHaveText(/83,37/);
    await page.getByLabel("Peça com pintura").uncheck();
    await expect(page.getByTestId("preco-total")).toHaveText(/R\$\s83,37/);

    await page.getByRole("button", { name: "Salvar orçamento" }).click();
    await expect(page.getByText("Orçamento salvo no histórico")).toBeVisible();
    await expect(page).toHaveURL(/\?id=[0-9a-f-]{36}&salvo=1$/);
    await expect(page.getByRole("button", { name: "Atualizar orçamento" })).toBeVisible();
  });

  test("histórico: muda status, registra entrega e mostra os dados reais", async ({ page }) => {
    await page.goto("/historico");
    const c = cartao(page);
    await expect(c).toContainText(/R\$\s83,37/);
    await expect(c).toContainText("PLA · 3 pç");

    await c.getByLabel("Status").selectOption("aprovado");
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(cartao(page).getByLabel("Status")).toHaveValue("aprovado");

    await cartao(page).getByLabel("Status").selectOption("entregue");
    await cartao(page).getByLabel("Horas reais de impressão").fill("7,5");
    await cartao(page).getByLabel("Filamento real usado").fill("105");
    await cartao(page).getByRole("button", { name: "Marcar como entregue" }).click();
    await expect(cartao(page)).toContainText("Real: 7,5 h (est. 7 h)");
    await expect(cartao(page)).toContainText("105 g");
    await expect(cartao(page)).toContainText("sem falha");

    // Corrigir a entrega depois: o formulário volta com os valores gravados.
    await cartao(page).getByRole("button", { name: "Editar entrega" }).click();
    await expect(cartao(page).getByLabel("Horas reais de impressão")).toHaveValue("7,5");
    await cartao(page).getByLabel("Houve falha (reimpressão)?").check();
    await cartao(page).getByRole("button", { name: "Marcar como entregue" }).click();
    await expect(cartao(page)).toContainText("com falha");
  });

  test("reabre, altera a quantidade e atualiza sem duplicar", async ({ page }) => {
    await page.goto("/historico");
    await cartao(page).getByRole("link", { name: "Abrir" }).click();
    await expect(page.getByRole("heading", { name: "Editar orçamento" })).toBeVisible();
    await expect(page.getByLabel("Peça / descrição")).toHaveValue(peca);
    await expect(page.getByTestId("preco-total")).toHaveText(/R\$\s83,37/);

    await page.getByLabel("Quantidade de peças", { exact: true }).fill("4");
    const novoPreco = (await page.getByTestId("preco-total").textContent())!;
    expect(novoPreco).not.toMatch(/83,37/);
    await page.getByRole("button", { name: "Atualizar orçamento" }).click();
    await expect(page.getByText("Orçamento atualizado")).toBeVisible();

    await page.goto("/historico");
    await expect(cartao(page)).toHaveCount(1);
    await expect(cartao(page)).toContainText(novoPreco.trim());
    await expect(cartao(page)).toContainText("4 pç");
  });

  test("exclui o orçamento", async ({ page }) => {
    await page.goto("/historico");
    await cartao(page).getByRole("button", { name: "Excluir" }).click();
    await cartao(page).getByRole("button", { name: "Confirmar" }).click();
    await expect(cartao(page)).toHaveCount(0);
  });
});
