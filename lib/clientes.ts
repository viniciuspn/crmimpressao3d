import type { StatusOrcamento } from "@/lib/dominio";

export type ResumoCliente = { orcamentos: number; fechados: number; valorFechado: number };

/** Por cliente: quantos orçamentos, quantos fecharam (aprovado ou entregue) e o valor fechado. */
export function resumirPorCliente(
  orcamentos: { cliente_id: string | null; status: StatusOrcamento; preco: number }[],
): Map<string, ResumoCliente> {
  const resumo = new Map<string, ResumoCliente>();
  for (const o of orcamentos) {
    if (!o.cliente_id) continue;
    const r = resumo.get(o.cliente_id) ?? { orcamentos: 0, fechados: 0, valorFechado: 0 };
    r.orcamentos += 1;
    if (o.status === "aprovado" || o.status === "entregue") {
      r.fechados += 1;
      r.valorFechado += o.preco;
    }
    resumo.set(o.cliente_id, r);
  }
  return resumo;
}
