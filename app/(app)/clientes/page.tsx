import { resumirPorCliente } from "@/lib/clientes";
import { requireUser } from "@/lib/supabase/server";
import { ListaClientes } from "./lista-clientes";

export default async function ClientesPage() {
  const { supabase } = await requireUser();
  const [clientes, orcamentos] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone, email, cidade, observacoes").order("nome"),
    supabase.from("orcamentos").select("cliente_id, status, preco").not("cliente_id", "is", null),
  ]);
  const resumo = resumirPorCliente(orcamentos.data ?? []);

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Clientes</h1>
      {clientes.error && <p className="text-sm text-danger">Não foi possível carregar os clientes.</p>}
      <ListaClientes
        clientes={(clientes.data ?? []).map((c) => ({
          ...c,
          resumo: resumo.get(c.id) ?? { orcamentos: 0, fechados: 0, valorFechado: 0 },
        }))}
      />
    </section>
  );
}
