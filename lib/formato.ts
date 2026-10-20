const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarBRL(valor: number) {
  return brl.format(valor);
}

const custoUnitario = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** Custos unitários pequenos precisam de mais casas (ex.: R$ 0,0009/ml). */
export function formatarCustoUnitario(valor: number) {
  return custoUnitario.format(valor);
}

export function formatarNumero(valor: number, casas = 2) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(valor);
}

/**
 * Lê um número digitado em pt-BR ou com ponto decimal.
 * Com vírgula, o ponto é separador de milhar ("1.234,5" → 1234.5).
 * Sem vírgula, pontos em grupos de 3 depois de um dígito não nulo são milhar ("1.000" → 1000, "3.200" → 3200);
 * nos demais casos o ponto é decimal ("0.4" → 0.4, "3.5" → 3.5).
 * Vazio → undefined; texto inválido → NaN.
 */
export function paraNumero(valor: unknown): number | undefined {
  if (typeof valor === "number") return valor;
  if (typeof valor !== "string") return undefined;
  const texto = valor.trim().replace(/\s/g, "");
  if (texto === "") return undefined;
  const normalizado =
    texto.includes(",") || /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(texto)
      ? texto.replace(/\./g, "").replace(",", ".")
      : texto;
  return /^-?\d*\.?\d+$/.test(normalizado) ? Number(normalizado) : Number.NaN;
}

/** Valor de campo numérico para exibir num input (vírgula decimal, sem milhar). */
export function numeroParaCampo(valor: number | null | undefined) {
  return valor == null ? "" : String(valor).replace(".", ",");
}
