// Relatório de calibração: compara estimado × real dos orçamentos entregues e sugere ajustes.

export type Entrega = {
  horasEstimadas: number | null;
  horasReais: number | null;
  gramasEstimadas: number | null;
  gramasReais: number | null;
  houveFalha: boolean | null;
  /** Mesas do orçamento: uma falha perde ~1 mesa, então a taxa real é falhas ÷ mesas. */
  mesas: number | null;
  /** Valores congelados no orçamento (as gramas estimadas já incluem o desperdício). */
  desperdicioUsado: number | null;
  taxaFalhaUsada: number | null;
};

/** Abaixo disso, o relatório mostra os números mas não sugere ajuste. */
export const AMOSTRA_MINIMA = 5;
/**
 * Peso (em mesas) da taxa usada nos orçamentos: com poucos dados, 1 falha em 3 mesas não vira 33%.
 * sugestão = (falhas + taxa_usada × PESO) ÷ (mesas + PESO)
 */
export const PESO_TAXA_USADA = 10;
/** Diferenças menores que isso (pontos percentuais) não viram sugestão. */
const DIFERENCA_MINIMA = 0.5;

const arred1 = (v: number) => Math.round(v * 10) / 10;
const soma = (v: number[]) => v.reduce((s, x) => s + x, 0);
const media = (v: number[]) => (v.length ? soma(v) / v.length : null);
const temReal = (e: Entrega) => (e.horasReais ?? 0) > 0 || (e.gramasReais ?? 0) > 0;

export function calibrar(entregas: Entrega[], taxaFalhaAtual: number, desperdicioAtual: number) {
  // Desvios e desperdício só com entregas sem falha: a reimpressão já é coberta pela taxa de falha.
  const semFalha = entregas.filter((e) => e.houveFalha !== true);
  const comHoras = semFalha.filter((e) => (e.horasEstimadas ?? 0) > 0 && (e.horasReais ?? 0) > 0);
  const comGramas = semFalha.filter((e) => (e.gramasEstimadas ?? 0) > 0 && (e.gramasReais ?? 0) > 0);

  // Razão das somas (ponderada pelo tamanho do trabalho): um chaveiro errado não distorce tudo.
  const desvioHoras = comHoras.length
    ? soma(comHoras.map((e) => e.horasReais!)) / soma(comHoras.map((e) => e.horasEstimadas!)) - 1
    : null;
  const desvioGramas = comGramas.length
    ? soma(comGramas.map((e) => e.gramasReais!)) / soma(comGramas.map((e) => e.gramasEstimadas!)) - 1
    : null;

  // Falha: só entregas registradas de verdade (com horas ou gramas reais), contadas por mesa.
  const comFalha = entregas.filter((e) => e.houveFalha !== null && temReal(e));
  const falhas = comFalha.filter((e) => e.houveFalha).length;
  const mesas = soma(comFalha.map((e) => Math.max(1, e.mesas ?? 1)));
  const taxaFalhaReal = mesas ? falhas / mesas : null;

  // Base fixa: a taxa usada nos próprios orçamentos (não a configuração atual), para a sugestão não
  // mudar a cada vez que é aplicada.
  const taxaBase = media(comFalha.flatMap((e) => (e.taxaFalhaUsada === null ? [] : [e.taxaFalhaUsada]))) ?? taxaFalhaAtual;
  const taxaCalculada =
    comFalha.length >= AMOSTRA_MINIMA
      ? arred1(((falhas + (taxaBase / 100) * PESO_TAXA_USADA) / (mesas + PESO_TAXA_USADA)) * 100)
      : null;

  // Desperdício que teria acertado as gramas: Σ real ÷ Σ base − 1, com base = estimado ÷ (1 + desperdício usado).
  // Tirar o desperdício de cada orçamento antes de somar mantém a razão das somas quando ele variou entre orçamentos.
  const desperdicioCalculado =
    comGramas.length >= AMOSTRA_MINIMA
      ? Math.min(
          100,
          Math.max(
            0,
            arred1(
              (soma(comGramas.map((e) => e.gramasReais!)) /
                soma(comGramas.map((e) => e.gramasEstimadas! / (1 + (e.desperdicioUsado ?? desperdicioAtual) / 100))) -
                1) *
                100,
            ),
          ),
        )
      : null;

  const diferente = (sugestao: number | null, atual: number) =>
    sugestao !== null && Math.abs(sugestao - atual) >= DIFERENCA_MINIMA ? sugestao : null;

  return {
    entregas: entregas.length,
    comHoras: comHoras.length,
    comGramas: comGramas.length,
    comFalha: comFalha.length,
    falhas,
    mesas,
    desvioHoras,
    desvioGramas,
    taxaFalhaReal,
    taxaBase,
    /** Calculada (pode ser igual à atual); null com amostra pequena. */
    taxaFalhaCalculada: taxaCalculada,
    desperdicioCalculado,
    /** Só quando difere da configuração atual. */
    taxaFalhaSugerida: diferente(taxaCalculada, taxaFalhaAtual),
    desperdicioSugerido: diferente(desperdicioCalculado, desperdicioAtual),
  };
}
