import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Lê .env.local como o Next. Credenciais do usuário de teste: E2E_EMAIL / E2E_SENHA.
loadEnvConfig(process.cwd());
process.env.E2E_EMAIL ??= process.env.USUARIO_INICIAL;
process.env.E2E_SENHA ??= process.env.SENHA_INICIAL;

// Os testes rodam contra o Supabase configurado no .env.local (dados reais):
// só criam registros com prefixo "E2E" e os apagam no fim.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "pt-BR",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "limpeza" },
    { name: "limpeza", testMatch: /limpeza\.teardown\.ts/ },
    {
      name: "celular",
      use: { ...devices["Pixel 7"], storageState: "e2e/.auth/usuario.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
