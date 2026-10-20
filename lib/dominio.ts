// Valores de domínio que o banco restringe com CHECK (text) ou enum.
// Ficam aqui, e não em database.types.ts, porque aquele arquivo é regenerado pelo `supabase gen types`.
import type { Enums } from "@/lib/database.types";

export const TIPOS_FILAMENTO = [
  "PLA",
  "PLA Silk",
  "PLA-CF",
  "PETG",
  "ABS",
  "ASA",
  "TPU",
  "Tritan",
  "Wood",
  "Outro",
] as const;
export type TipoFilamento = (typeof TIPOS_FILAMENTO)[number];

export const UNIDADES_INSUMO = ["un", "ml", "g", "cm", "folha"] as const;
export type UnidadeInsumo = (typeof UNIDADES_INSUMO)[number];

export const BASES_INSUMO = ["peca", "pedido"] as const;
export type BaseInsumo = (typeof BASES_INSUMO)[number];

export const STATUS_ORCAMENTO = ["enviado", "aprovado", "recusado", "entregue"] as const satisfies readonly Enums<"status_orcamento">[];
export type StatusOrcamento = Enums<"status_orcamento">;

export const TABELAS_CADASTRO = ["filamentos", "impressoras", "insumos"] as const;
export type TabelaCadastro = (typeof TABELAS_CADASTRO)[number];
