import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Kpi } from "@/components/kpi";
import { carregarHistorico } from "@/lib/historico";
import { formatarBRL } from "@/lib/formato";
import { indicadores, linkWhatsApp } from "@/lib/orcamento";
import { requireUser } from "@/lib/supabase/server";
import { ListaHistorico } from "../../historico/lista-historico";

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireUser();

  const [cliente, historico, config] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone, email, cidade, observacoes").eq("id", id).maybeSingle(),
    carregarHistorico(supabase, id),
    supabase.from("configuracoes").select("followup_dias").maybeSingle(),
  ]);
  const c = cliente.data;
  if (!c) notFound();

  const whatsapp = linkWhatsApp(c.telefone);
  const ind = indicadores(historico.itens);

  return (
    <section className="space-y-5">
      <Link href="/clientes" className="text-sm text-accent">
        ← Clientes
      </Link>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{c.nome}</h1>
        <p className="mt-1 text-sm text-muted">
          {[c.cidade, c.telefone, c.email].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
        </p>
        {c.observacoes && <p className="mt-2 text-sm whitespace-pre-line">{c.observacoes}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded border border-accent px-3 py-1.5 text-sm font-semibold text-accent">
              Abrir WhatsApp
            </a>
          )}
          <Link href="/" className="rounded border border-line px-3 py-1.5 text-sm font-semibold">
            Novo orçamento
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi rotulo="Orçamentos" valor={String(ind.quantidade)} />
        <Kpi rotulo="Aprovação" valor={ind.taxaAprovacao === null ? "—" : `${Math.round(ind.taxaAprovacao * 100)}%`} />
        <Kpi rotulo="Fechado" valor={formatarBRL(ind.valorFechado)} />
        <Kpi rotulo="Lucro estimado" valor={formatarBRL(ind.lucroEstimado)} />
      </div>

      <h2 className="text-lg font-semibold">Orçamentos</h2>
      <ListaHistorico
        itens={historico.itens}
        clientes={[]}
        followupDias={config.data?.followup_dias ?? 7}
        clienteInicial=""
        truncado={historico.truncado}
        semFiltroCliente
      />
    </section>
  );
}
