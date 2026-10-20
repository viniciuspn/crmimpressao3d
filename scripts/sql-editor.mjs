// Junta as migrações num único SQL para colar no SQL Editor do Supabase (alternativa ao `supabase db push`).
// Uso: node scripts/sql-editor.mjs [versao_inicial]   → grava aplicar-banco.sql
// Ex.: node scripts/sql-editor.mjs 20261020020000     (só as migrações a partir desta versão)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const desde = process.argv[2] ?? "0";
const dir = "supabase/migrations";
const arquivos = readdirSync(dir)
  .filter((f) => f.endsWith(".sql") && f.split("_")[0] >= desde)
  .sort();

if (arquivos.length === 0) {
  console.error(`Nenhuma migração a partir de ${desde}.`);
  process.exit(1);
}

const versoes = arquivos.map((f) => {
  const [versao, ...nome] = f.replace(".sql", "").split("_");
  return `  ('${versao}', '${nome.join("_")}')`;
});

const sql = [
  "-- Ideia: migrações para colar no SQL Editor do Supabase e clicar em Run.",
  `-- Gerado de supabase/migrations: ${arquivos.join(", ")}`,
  "-- Roda numa transação: ou aplica tudo, ou nada.",
  "",
  "begin;",
  "",
  ...arquivos.map((f) => `-- ===== ${f} =====\n${readFileSync(join(dir, f), "utf8")}`),
  "-- ===== histórico de migrações (para o supabase db push reconhecer) =====",
  "create schema if not exists supabase_migrations;",
  "create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);",
  "insert into supabase_migrations.schema_migrations (version, name) values",
  `${versoes.join(",\n")}`,
  "on conflict (version) do nothing;",
  "",
  "commit;",
  "",
  "select 'Banco do Ideia atualizado com sucesso' as resultado;",
  "",
].join("\n");

writeFileSync("aplicar-banco.sql", sql);
console.log(`aplicar-banco.sql: ${arquivos.length} migração(ões) — ${arquivos.join(", ")}`);
