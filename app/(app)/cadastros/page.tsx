import Link from "next/link";
import type { ReactNode } from "react";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Formulario } from "@/components/formulario";
import { custoPorUnidade, precoPorKg } from "@/lib/calculo";
import { camposFilamento, camposImpressora, camposInsumo } from "@/lib/cadastros";
import type { GrupoCampos, Valores } from "@/lib/form";
import type { TabelaCadastro } from "@/lib/dominio";
import { formatarBRL, formatarNumero } from "@/lib/formato";
import { requireUser } from "@/lib/supabase/server";
import {
  excluirCadastro,
  salvarFilamento,
  salvarImpressora,
  salvarInsumo,
} from "./actions";

const ABAS: { id: TabelaCadastro; rotulo: string; novo: string }[] = [
  { id: "filamentos", rotulo: "Filamentos", novo: "Novo filamento" },
  { id: "impressoras", rotulo: "Impressoras", novo: "Nova impressora" },
  { id: "insumos", rotulo: "Insumos", novo: "Novo insumo" },
];

export default async function CadastrosPage({ searchParams }: PageProps<"/cadastros">) {
  const { aba: abaParam } = await searchParams;
  const aba = ABAS.find((a) => a.id === abaParam) ?? ABAS[0];

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Cadastros</h1>

      <nav className="flex gap-1 rounded-xl bg-zinc-100 p-1" aria-label="Tipo de cadastro">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={`/cadastros?aba=${a.id}`}
            aria-current={a.id === aba.id ? "page" : undefined}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-sm ${
              a.id === aba.id ? "bg-white font-medium shadow-sm" : "text-zinc-600"
            }`}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>

      {aba.id === "filamentos" && <Filamentos />}
      {aba.id === "impressoras" && <Impressoras />}
      {aba.id === "insumos" && <Insumos />}
    </section>
  );
}

async function Filamentos() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("filamentos").select("*").order("ativo", { ascending: false }).order("nome");

  return (
    <Lista
      novo="Novo filamento"
      grupos={camposFilamento}
      acaoNovo={salvarFilamento.bind(null, null)}
      valoresNovo={{ tipo: "PLA", peso_rolo_g: 1000, frete: 0, ativo: true }}
      itens={(data ?? []).map((f) => ({
        id: f.id,
        titulo: f.nome,
        ativo: f.ativo,
        cor: f.cor,
        detalhe: `${f.tipo}${f.marca ? ` · ${f.marca}` : ""} · ${formatarBRL(precoPorKg(f))}/kg`,
        valores: f,
        acao: salvarFilamento.bind(null, f.id),
        excluir: excluirCadastro.bind(null, "filamentos", f.id),
      }))}
    />
  );
}

async function Impressoras() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("impressoras").select("*").order("ativo", { ascending: false }).order("nome");

  return (
    <Lista
      novo="Nova impressora"
      grupos={camposImpressora}
      acaoNovo={salvarImpressora.bind(null, null)}
      valoresNovo={{ manutencao_h: 0, ativo: true }}
      itens={(data ?? []).map((i) => ({
        id: i.id,
        titulo: i.nome,
        ativo: i.ativo,
        detalhe: `${formatarBRL(i.preco)} · ${formatarNumero(i.consumo_w)} W · depreciação ${formatarCusto(i.preco / i.vida_util_h)}/h`,
        valores: i,
        acao: salvarImpressora.bind(null, i.id),
        excluir: excluirCadastro.bind(null, "impressoras", i.id),
      }))}
    />
  );
}

async function Insumos() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("insumos").select("*").order("ativo", { ascending: false }).order("nome");

  return (
    <Lista
      novo="Novo insumo"
      grupos={camposInsumo}
      acaoNovo={salvarInsumo.bind(null, null)}
      valoresNovo={{ unidade: "un", ativo: true }}
      itens={(data ?? []).map((i) => {
        const custo = custoPorUnidade(i);
        return {
          id: i.id,
          titulo: i.nome,
          ativo: i.ativo,
          detalhe:
            custo === null ? (
              <span className="text-amber-700">Preencha a quantidade na embalagem</span>
            ) : (
              `${formatarBRL(i.preco_pago)} · ${formatarCusto(custo)}/${i.unidade}`
            ),
          valores: i,
          acao: salvarInsumo.bind(null, i.id),
          excluir: excluirCadastro.bind(null, "insumos", i.id),
        };
      })}
    />
  );
}

const custoUnitario = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** Custos unitários pequenos precisam de mais casas (ex.: R$ 0,0009/ml). */
function formatarCusto(valor: number) {
  return custoUnitario.format(valor);
}

type Item = {
  id: string;
  titulo: string;
  ativo: boolean;
  cor?: string | null;
  detalhe: ReactNode;
  valores: Valores;
  acao: Parameters<typeof Formulario>[0]["acao"];
  excluir: Parameters<typeof BotaoExcluir>[0]["acao"];
};

function Lista({
  novo,
  grupos,
  acaoNovo,
  valoresNovo,
  itens,
}: {
  novo: string;
  grupos: GrupoCampos[];
  acaoNovo: Item["acao"];
  valoresNovo: Valores;
  itens: Item[];
}) {
  return (
    <div className="space-y-3">
      <details className="group rounded-xl border border-dashed border-teal-300 bg-white">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium text-teal-800">
          <span className="group-open:hidden">+ {novo}</span>
          <span className="hidden group-open:inline">{novo}</span>
        </summary>
        <div className="border-t border-zinc-100 p-4">
          <Formulario grupos={grupos} valores={valoresNovo} acao={acaoNovo} rotuloBotao="Cadastrar" limparAoSalvar />
        </div>
      </details>

      {itens.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">Nada cadastrado ainda.</p>}

      <ul className="space-y-2">
        {itens.map((item) => (
          <li key={item.id}>
            <details className={`rounded-xl bg-white ring-1 ring-zinc-200 ${item.ativo ? "" : "opacity-60"}`}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                {item.cor !== undefined && (
                  <span
                    className="size-4 shrink-0 rounded-full ring-1 ring-zinc-300"
                    style={{ backgroundColor: item.cor ?? "transparent" }}
                    aria-hidden
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {item.titulo}
                    {!item.ativo && <span className="ml-2 text-xs font-normal text-zinc-500">(inativo)</span>}
                  </span>
                  <span className="block truncate text-sm text-zinc-500">{item.detalhe}</span>
                </span>
                <span className="text-sm text-teal-700">Editar</span>
              </summary>
              <div className="space-y-3 border-t border-zinc-100 p-4">
                <Formulario grupos={grupos} valores={item.valores} acao={item.acao} />
                <div className="border-t border-zinc-100 pt-3">
                  <BotaoExcluir
                    acao={item.excluir}
                    confirmacao={`Excluir "${item.titulo}"? Se já foi usado em orçamentos, será só desativado.`}
                  />
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
