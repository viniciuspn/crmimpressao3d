import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

// Esqueleto mínimo do que o Supabase oferece: schema auth, auth.uid() e os papéis anon/authenticated.
const STUB = `
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
$$;
create role anon nologin;
create role authenticated nologin;
-- No Supabase, quem grava em auth.users é o serviço de Auth, com este papel (não superusuário).
create role supabase_auth_admin nologin;
grant usage on schema auth to anon, authenticated, supabase_auth_admin;
grant insert, delete on auth.users to supabase_auth_admin;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
`;

const MIGRATIONS_DIR = join(__dirname, "..", "..", "supabase", "migrations");

/** `usuariosAntes`: usuários que já existiam no Auth antes das migrações rodarem. */
export async function criarBanco({ usuariosAntes = [] as string[] } = {}) {
  const db = new PGlite();
  await db.exec(STUB);
  for (const id of usuariosAntes) await criarUsuario(db, id);
  for (const arquivo of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, arquivo), "utf8"));
  }
  return db;
}

export async function criarUsuario(db: PGlite, id: string) {
  await db.exec("begin");
  try {
    await db.exec("set local role supabase_auth_admin");
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@teste`]);
    await db.exec("commit");
  } catch (erro) {
    await db.exec("rollback");
    throw erro;
  }
}

/** Executa fn como o usuário autenticado `uid` (ou anon, se null), dentro de uma transação. */
export async function como<T>(db: PGlite, uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(uid ? { sub: uid, role: "authenticated" } : { role: "anon" }),
    ]);
    const resultado = await fn();
    await db.exec("commit");
    return resultado;
  } catch (erro) {
    await db.exec("rollback");
    throw erro;
  }
}
