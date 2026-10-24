import Link from "next/link";
import { carregarHistorico } from "@/lib/historico";
import { requireUser } from "@/lib/supabase/server";
import { ListaHistorico } from "./lista-historico";

export default async function HistoricoPage() {
  const { supabase } = await requireUser();

  const [historico, clientes, config] = await Promise.all([
    carregarHistorico(supabase),
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("configuracoes").select("followup_dias").maybeSingle(),
  ]);
  const erro = historico.erro || clientes.error || config.error;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Histórico</h1>
        <Link href="/calibracao" className="text-sm font-semibold text-accent">
          Relatório de calibração →
        </Link>
      </div>
      {erro && <p className="text-sm text-danger">Não foi possível carregar tudo. Recarregue a página.</p>}
      <ListaHistorico
        itens={historico.itens}
        clientes={clientes.data ?? []}
        followupDias={config.data?.followup_dias ?? 7}
        truncado={historico.truncado}
      />
    </section>
  );
}
