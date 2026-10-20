"use client";

import { useActionState } from "react";
import type { EstadoAcao } from "@/lib/form";

type Props = {
  acao: (estado: EstadoAcao) => Promise<EstadoAcao>;
  confirmacao: string;
};

export function BotaoExcluir({ acao, confirmacao }: Props) {
  const [estado, formAction, pendente] = useActionState(acao, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmacao)) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <button
        type="submit"
        disabled={pendente}
        className="rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {pendente ? "Excluindo…" : "Excluir"}
      </button>
      {(estado.erro || estado.mensagem) && (
        <p role="status" className={`text-sm ${estado.erro ? "text-red-600" : "text-zinc-600"}`}>
          {estado.erro ?? estado.mensagem}
        </p>
      )}
    </form>
  );
}
