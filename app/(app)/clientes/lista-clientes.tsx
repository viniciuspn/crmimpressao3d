"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BotaoExcluir } from "@/components/botao-excluir";
import { caixaClass, controleClass, Formulario } from "@/components/formulario";
import { camposCliente } from "@/lib/cadastros";
import type { ResumoCliente } from "@/lib/clientes";
import { formatarBRL, plural } from "@/lib/formato";
import { linkWhatsApp, normalizarBusca } from "@/lib/orcamento";
import { excluirCliente, salvarCliente } from "./actions";

export type ClienteLista = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  observacoes: string | null;
  resumo: ResumoCliente;
};

export function ListaClientes({ clientes }: { clientes: ClienteLista[] }) {
  const [busca, setBusca] = useState("");
  const visiveis = useMemo(() => {
    const q = normalizarBusca(busca.trim());
    if (!q) return clientes;
    const digitos = q.replace(/\D/g, "");
    return clientes.filter(
      (c) =>
        [c.nome, c.telefone, c.cidade, c.email].some((v) => normalizarBusca(v).includes(q)) ||
        // "31999990000" encontra "(31) 99999-0000"
        (digitos.length >= 4 && (c.telefone ?? "").replace(/\D/g, "").includes(digitos)),
    );
  }, [clientes, busca]);

  return (
    <div className="space-y-3">
      <details className="group rounded-md border border-dashed border-accent/50 bg-panel">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium text-accent">
          <span className="group-open:hidden">+ Novo cliente</span>
          <span className="hidden group-open:inline">Novo cliente</span>
        </summary>
        <div className="border-t border-line p-4">
          <Formulario grupos={camposCliente} acao={salvarCliente.bind(null, null)} rotuloBotao="Cadastrar cliente" limparAoSalvar />
        </div>
      </details>

      <div className={caixaClass}>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, telefone, cidade ou e-mail"
          aria-label="Buscar cliente"
          className={controleClass}
        />
      </div>

      {visiveis.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">
          {clientes.length ? "Nenhum cliente encontrado para essa busca." : "Nenhum cliente cadastrado ainda."}
        </p>
      )}

      <ul className="space-y-2">
        {visiveis.map((c) => {
          const whatsapp = linkWhatsApp(c.telefone);
          return (
            <li key={c.id} data-testid="cliente">
              <details className="rounded-md border border-line bg-panel">
                <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.nome}</span>
                    <span className="block truncate text-xs text-muted">
                      {[c.cidade, c.telefone].filter(Boolean).join(" · ") || "Sem contato"}
                    </span>
                    <span className="block text-xs text-muted">
                      {c.resumo.orcamentos
                        ? `${plural(c.resumo.orcamentos, "orçamento")} · ${plural(c.resumo.fechados, "fechado")}${c.resumo.fechados ? ` (${formatarBRL(c.resumo.valorFechado)})` : ""}`
                        : "Sem orçamentos"}
                    </span>
                  </span>
                  <span className="text-sm text-accent">Editar</span>
                </summary>
                <div className="space-y-3 border-t border-line p-4">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/clientes/${c.id}`} className="rounded border border-line px-2.5 py-1 text-xs font-semibold">
                      Ver histórico
                    </Link>
                    {whatsapp && (
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded border border-accent px-2.5 py-1 text-xs font-semibold text-accent">
                        WhatsApp
                      </a>
                    )}
                  </div>
                  <Formulario
                    grupos={camposCliente}
                    valores={{ nome: c.nome, telefone: c.telefone, email: c.email, cidade: c.cidade, observacoes: c.observacoes }}
                    acao={salvarCliente.bind(null, c.id)}
                  />
                  <div className="border-t border-line pt-3">
                    <BotaoExcluir
                      acao={excluirCliente.bind(null, c.id)}
                      aviso="Toque de novo para excluir. Os orçamentos dele continuam no histórico, sem cliente."
                    />
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
