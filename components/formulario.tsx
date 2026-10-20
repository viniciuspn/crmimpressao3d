"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import type { Campo, EstadoAcao, GrupoCampos, Valores } from "@/lib/form";
import { numeroParaCampo } from "@/lib/formato";

type Props = {
  grupos: GrupoCampos[];
  valores?: Valores;
  acao: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
  rotuloBotao?: string;
  /** Limpa os campos depois de salvar (formulário de "novo"). */
  limparAoSalvar?: boolean;
};

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base focus:border-teal-600 focus:outline-none aria-invalid:border-red-500";

export function Formulario({ grupos, valores = {}, acao, rotuloBotao = "Salvar", limparAoSalvar }: Props) {
  const [estado, formAction, pendente] = useActionState(acao, {});
  const formRef = useRef<HTMLFormElement>(null);
  const idBase = useId();

  useEffect(() => {
    if (estado.ok && limparAoSalvar) formRef.current?.reset();
    if (estado.erros) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [estado, limparAoSalvar]);

  return (
    <form
      ref={formRef}
      // onSubmit em vez de action={}: com action, o React 19 limpa o formulário mesmo quando a validação falha.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="space-y-5"
      noValidate
    >
      {grupos.map((grupo, i) => (
        <fieldset key={grupo.titulo ?? i} className="space-y-3">
          {grupo.titulo && <legend className="mb-2 text-sm font-semibold text-zinc-700">{grupo.titulo}</legend>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {grupo.campos.map((campo) => (
              <CampoFormulario
                key={campo.nome}
                campo={campo}
                id={`${idBase}-${campo.nome}`}
                valor={valores[campo.nome]}
                erro={estado.erros?.[campo.nome]?.[0]}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {pendente ? "Salvando…" : rotuloBotao}
        </button>
        <p role="status" className={`text-sm ${estado.erro ? "text-red-600" : "text-teal-700"}`}>
          {pendente ? "" : (estado.erro ?? (estado.ok ? (estado.mensagem ?? "Salvo") : ""))}
        </p>
      </div>
    </form>
  );
}

function CampoFormulario({
  campo,
  id,
  valor,
  erro,
}: {
  campo: Campo;
  id: string;
  valor: Valores[string];
  erro?: string;
}) {
  if (campo.tipo === "checkbox") {
    return (
      <label className={`flex items-center gap-2 self-end py-2 ${campo.inteiro ? "sm:col-span-2" : ""}`}>
        <input type="checkbox" name={campo.nome} defaultChecked={valor === true} className="size-5 accent-teal-700" />
        <span className="text-sm">{campo.rotulo}</span>
      </label>
    );
  }

  const comum = {
    id,
    name: campo.nome,
    "aria-invalid": erro ? true : undefined,
    "aria-required": campo.obrigatorio || undefined,
    "aria-describedby": erro || campo.ajuda ? `${id}-ajuda` : undefined,
  };

  let controle;
  if (campo.tipo === "selecao") {
    controle = (
      <select {...comum} defaultValue={String(valor ?? campo.opcoes?.[0] ?? "")} className={inputClass}>
        {campo.opcoes?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else if (campo.tipo === "textarea") {
    controle = <textarea {...comum} rows={3} defaultValue={String(valor ?? "")} className={inputClass} />;
  } else if (campo.tipo === "cor") {
    controle = <CampoCor comum={comum} valor={typeof valor === "string" ? valor : null} />;
  } else {
    const numerico = campo.tipo === "decimal" || campo.tipo === "inteiro";
    controle = (
      <input
        {...comum}
        type="text"
        inputMode={campo.tipo === "decimal" ? "decimal" : campo.tipo === "inteiro" ? "numeric" : undefined}
        autoComplete="off"
        defaultValue={numerico ? numeroParaCampo(valor as number | null) : String(valor ?? "")}
        className={inputClass}
      />
    );
  }

  return (
    <div className={campo.inteiro ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-700">
        {campo.rotulo}
        {campo.obrigatorio && <span className="text-red-600"> *</span>}
      </label>
      <div className="flex items-center gap-2">
        {campo.prefixo && <span className="text-sm text-zinc-500">{campo.prefixo}</span>}
        {controle}
        {campo.sufixo && <span className="shrink-0 text-sm text-zinc-500">{campo.sufixo}</span>}
      </div>
      {(erro || campo.ajuda) && (
        <p id={`${id}-ajuda`} className={`mt-1 text-xs ${erro ? "text-red-600" : "text-zinc-500"}`}>
          {erro ?? campo.ajuda}
        </p>
      )}
    </div>
  );
}

/** input type=color sempre envia um valor; "Sem cor" desabilita o input para ele não ser enviado (vira null). */
function CampoCor({ comum, valor }: { comum: { id: string; name: string }; valor: string | null }) {
  const [semCor, setSemCor] = useState(!valor);
  return (
    <div className="flex w-full items-center gap-3">
      <input
        {...comum}
        type="color"
        disabled={semCor}
        defaultValue={valor ?? "#ffffff"}
        className="h-10 w-16 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-40"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={semCor}
          onChange={(e) => setSemCor(e.target.checked)}
          className="size-5 accent-teal-700"
        />
        Sem cor
      </label>
    </div>
  );
}
