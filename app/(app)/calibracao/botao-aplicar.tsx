"use client";

import { useActionState } from "react";
import type { EstadoAcao } from "@/lib/form";

export function BotaoAplicar({ acao, rotulo }: { acao: () => Promise<EstadoAcao>; rotulo: string }) {
  const [estado, executar, pendente] = useActionState(acao, {});
  return (
    <form action={executar} className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pendente || estado.ok}
        className="rounded bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
      >
        {pendente ? "Aplicando…" : rotulo}
      </button>
      <p role="status" className={`text-sm ${estado.erro ? "text-danger" : "text-accent"}`}>
        {estado.erro ?? estado.mensagem}
      </p>
    </form>
  );
}
