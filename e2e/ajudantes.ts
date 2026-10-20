import type { Page } from "@playwright/test";

/** Preenche o caso A da spec com impressora manual, sem depender das configurações salvas. */
export async function preencherCasoA(page: Page, peca: string) {
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
