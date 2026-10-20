"use client";

import { startTransition, useActionState } from "react";
import { entrar, type LoginState } from "./actions";

const inputClass =
  "mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-base text-ink outline-none focus:border-accent focus:ring-2 focus:ring-soft";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(entrar, {});

  return (
    <form
      // onSubmit em vez de action={}: com action, o React 19 limpa o e-mail quando a senha está errada.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
    >
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
        <p role="alert" className="text-sm text-danger">
          {state.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-accent py-2.5 font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
