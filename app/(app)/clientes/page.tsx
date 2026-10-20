import { resumirPorCliente } from "@/lib/clientes";
import { todasAsPaginas } from "@/lib/paginar";
import { requireUser } from "@/lib/supabase/server";
import { ListaClientes } from "./lista-clientes";

export default async function ClientesPage() {
  const { supabase } = await requireUser();
  const [clientes, orcamentos] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone, email, cidade, observacoes").order("nome"),
    // Todos os orçamentos com cliente (em páginas), para os totais não pararem em 1000.
    todasAsPaginas((de, ate) =>
      supabase.from("orcamentos").select("cliente_id, status, preco").not("cliente_id", "is", null).order("id").range(de, ate),
    ),
  ]);
  const resumo = resumirPorCliente(orcamentos.dados);

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Clientes</h1>
      {(clientes.error || orcamentos.erro) && <p className="text-sm text-danger">Não foi possível carregar tudo. Recarregue a página.</p>}
      <ListaClientes
        clientes={(clientes.data ?? []).map((c) => ({
          ...c,
          resumo: resumo.get(c.id) ?? { orcamentos: 0, fechados: 0, valorFechado: 0 },
        }))}
      />
    </section>
  );
}
