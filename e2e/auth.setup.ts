import { expect, test as setup } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const senha = process.env.E2E_SENHA;

setup("login", async ({ page }) => {
  if (!email || !senha) throw new Error("Defina E2E_EMAIL e E2E_SENHA no .env.local");

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos")).toBeVisible();

  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Orçamento" })).toBeVisible();

  await page.context().storageState({ path: "e2e/.auth/usuario.json" });
});
