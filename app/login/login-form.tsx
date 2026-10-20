"use client";

import { useActionState } from "react";
import { entrar, type LoginState } from "./actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-teal-600 focus:outline-none";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(entrar, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">E-mail</span>
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Senha</span>
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      {state.erro && (
        <p role="alert" className="text-sm text-red-600">
          {state.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-700 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
