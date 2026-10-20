// Relatório de calibração: compara estimado × real dos orçamentos entregues e sugere ajustes.

export type Entrega = {
  horasEstimadas: number | null;
  horasReais: number | null;
  gramasEstimadas: number | null;
  gramasReais: number | null;
  houveFalha: boolean | null;
  /** Desperdício (%) usado no orçamento; as gramas estimadas já o incluem. */
  desperdicioUsado: number | null;
};

/** Abaixo disso, o relatório mostra os números mas não sugere ajuste. */
export const AMOSTRA_MINIMA = 5;
/**
 * Peso (em trabalhos) da taxa atual na sugestão: com poucos dados, 1 falha em 3 não vira 33%.
 * sugestão = (falhas + taxa_atual × PESO) ÷ (entregas com resposta + PESO)
 */
export const PESO_TAXA_ATUAL = 10;

const media = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null);
const arred1 = (v: number) => Math.round(v * 10) / 10;

export function calibrar(entregas: Entrega[], taxaFalhaAtual: number, desperdicioAtual: number) {
  const comHoras = entregas.filter((e) => e.horasEstimadas && e.horasEstimadas > 0 && e.horasReais !== null);
  const comGramas = entregas.filter((e) => e.gramasEstimadas && e.gramasEstimadas > 0 && e.gramasReais !== null);
  const comFalha = entregas.filter((e) => e.houveFalha !== null);
  const falhas = comFalha.filter((e) => e.houveFalha).length;

  // Desvio relativo médio: +0,10 = real 10% acima do estimado.
  const desvioHoras = media(comHoras.map((e) => e.horasReais! / e.horasEstimadas! - 1));
  const desvioGramas = media(comGramas.map((e) => e.gramasReais! / e.gramasEstimadas! - 1));

  const taxaFalhaReal = comFalha.length ? falhas / comFalha.length : null;
  const taxaFalhaSugerida =
    comFalha.length >= AMOSTRA_MINIMA
      ? arred1(((falhas + (taxaFalhaAtual / 100) * PESO_TAXA_ATUAL) / (comFalha.length + PESO_TAXA_ATUAL)) * 100)
      : null;

  // Desperdício que teria acertado as gramas: (1 + desperdício usado) × real/estimado − 1, em média.
  const desperdicioSugerido =
    comGramas.length >= AMOSTRA_MINIMA
      ? Math.max(
          0,
          arred1(
            media(
              comGramas.map(
                (e) => ((1 + (e.desperdicioUsado ?? desperdicioAtual) / 100) * e.gramasReais!) / e.gramasEstimadas! - 1,
              ),
            )! * 100,
          ),
        )
      : null;

  return {
    entregas: entregas.length,
    comHoras: comHoras.length,
    comGramas: comGramas.length,
    comFalha: comFalha.length,
    falhas,
    desvioHoras,
    desvioGramas,
    taxaFalhaReal,
    taxaFalhaSugerida: taxaFalhaSugerida !== null && taxaFalhaSugerida !== arred1(taxaFalhaAtual) ? taxaFalhaSugerida : null,
    desperdicioSugerido:
      desperdicioSugerido !== null && desperdicioSugerido !== arred1(desperdicioAtual) ? desperdicioSugerido : null,
  };
}
