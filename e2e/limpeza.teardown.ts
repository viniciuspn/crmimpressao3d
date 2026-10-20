import { createClient } from "@supabase/supabase-js";
import { test as teardown } from "@playwright/test";
import type { Database } from "../lib/database.types";

// Roda sempre no fim (mesmo se algum teste falhar) e apaga o que os testes criaram.
teardown("apagar registros E2E", async () => {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_EMAIL!,
    password: process.env.E2E_SENHA!,
  });
  if (error) throw error;

  // Orçamentos primeiro: filamentos e impressoras usados neles não podem ser apagados.
  const { error: eo } = await supabase.from("orcamentos").delete().like("peca", "E2E %");
  if (eo) throw eo;

  for (const tabela of ["clientes", "filamentos", "impressoras", "insumos"] as const) {
    const { error: e } = await supabase.from(tabela).delete().like("nome", "E2E %");
    if (e) throw e;
  }
  await supabase.auth.signOut({ scope: "local" });
});
