"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import type { EstadoAcao } from "@/lib/form";

type Props = {
  acao: (estado: EstadoAcao) => Promise<EstadoAcao>;
  /** Dica exibida enquanto o botão espera a confirmação. */
  aviso?: string;
};

/** Excluir em dois toques (como no protótipo): o primeiro arma "Confirmar" por 3,5 s, o segundo exclui. */
export function BotaoExcluir({ acao, aviso }: Props) {
  const [estado, executar, pendente] = useActionState(acao, {});
  const [armado, setArmado] = useState(false);

  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 3500);
    return () => clearTimeout(t);
  }, [armado]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (!armado) return setArmado(true);
          setArmado(false);
          startTransition(() => executar());
        }}
        className={`rounded border px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
          armado ? "border-danger bg-danger text-panel" : "border-line text-danger hover:bg-danger/10"
        }`}
      >
        {pendente ? "Excluindo…" : armado ? "Confirmar" : "Excluir"}
      </button>
      <p role="status" className={`text-sm ${estado.erro ? "text-danger" : "text-muted"}`}>
        {armado ? aviso : (estado.erro ?? estado.mensagem)}
      </p>
    </div>
  );
}
