// Peças comuns dos formulários: estado das Server Actions, campos Zod que leem FormData e a descrição dos campos na tela.
import { z } from "zod";
import { paraNumero } from "@/lib/formato";

export type EstadoAcao = {
  ok?: boolean;
  mensagem?: string;
  erro?: string;
  erros?: Record<string, string[] | undefined>;
};

type OpcoesNumero = { min?: number; max?: number; menorQue?: number; maiorQue?: number; casas?: number };

// Cabe em numeric(12,2) e em integer com folga; acima disso é erro de digitação.
const MAXIMO_PADRAO = 1_000_000_000;

function numero(base: z.ZodNumber, { min, max = MAXIMO_PADRAO, menorQue, maiorQue, casas }: OpcoesNumero) {
  let s = base;
  if (min !== undefined) s = s.min(min, `Mínimo ${String(min).replace(".", ",")}`);
  if (max !== undefined) s = s.max(max, `Máximo ${String(max).replace(".", ",")}`);
  if (menorQue !== undefined) s = s.lt(menorQue, `Deve ser menor que ${menorQue}`);
  if (maiorQue !== undefined) s = s.gt(maiorQue, `Deve ser maior que ${maiorQue}`);
  // O banco arredondaria em silêncio; melhor avisar.
  if (casas !== undefined) {
    return s.refine((v) => Number(v.toFixed(casas)) === v, `Use no máximo ${casas} casas decimais`);
  }
  return s;
}

const numeroInvalido = { error: "Informe um número" };

/** Decimal obrigatório, aceita vírgula. */
export function decimal(opcoes: OpcoesNumero = {}) {
  return z.preprocess(paraNumero, numero(z.number(numeroInvalido), opcoes));
}

/** Decimal opcional: campo vazio vira null. */
export function decimalOpcional(opcoes: OpcoesNumero = {}) {
  return z.preprocess((v) => paraNumero(v) ?? null, numero(z.number(numeroInvalido), opcoes).nullable());
}

export function inteiro(opcoes: OpcoesNumero = {}) {
  return z.preprocess(
    paraNumero,
    numero(z.number(numeroInvalido).int("Use um número inteiro"), opcoes),
  );
}

export const textoObrigatorio = (mensagem = "Campo obrigatório", max = 120) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string(mensagem).min(1, mensagem).max(max, `Máximo de ${max} caracteres`),
  );

/** Texto opcional: vazio ou só espaços vira null. */
export const textoOpcional = (max = 120) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().max(max, `Máximo de ${max} caracteres`).nullable(),
  );

/** Checkbox HTML: presente ("on") = true, ausente = false. */
export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** Valida o FormData com o schema; devolve os dados ou o estado de erro para o formulário. */
export function lerFormulario<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { dados: z.output<S>; erro?: never } | { dados?: never; erro: EstadoAcao } {
  const resultado = schema.safeParse(Object.fromEntries(formData));
  if (resultado.success) return { dados: resultado.data };
  return {
    erro: {
      erro: "Confira os campos destacados",
      erros: z.flattenError(resultado.error).fieldErrors as Record<string, string[]>,
    },
  };
}

/** Mensagem amigável para erros do Postgres/PostgREST. */
export function mensagemErroBanco(erro: { code?: string; message: string }) {
  if (erro.code === "23514" || erro.code === "22003") return "Algum valor está fora do permitido";
  if (erro.code === "23503") return "Este registro está ligado a outro e não pode ser alterado assim";
  if (erro.code === "42501") return "Sem permissão para esta operação";
  return "Não foi possível salvar. Tente de novo.";
}

// Descrição dos campos na tela (usada por components/formulario.tsx).
export type Campo = {
  nome: string;
  rotulo: string;
  tipo: "texto" | "decimal" | "inteiro" | "cor" | "selecao" | "checkbox" | "textarea";
  opcoes?: readonly string[];
  /** Texto curto depois do campo, ex.: "R$", "%", "h". */
  sufixo?: string;
  prefixo?: string;
  ajuda?: string;
  obrigatorio?: boolean;
  /** Ocupa a linha inteira no grid de 2 colunas. */
  inteiro?: boolean;
};

export type GrupoCampos = { titulo?: string; campos: Campo[] };

export type Valores = Record<string, string | number | boolean | null | undefined>;
