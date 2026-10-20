// PROVISÓRIO: escrito à mão a partir de supabase/migrations, no formato do `supabase gen types`.
// Substitua pelo gerado assim que o projeto existir: `npm run db:types`.
// Não importe tipos de domínio daqui (use lib/dominio.ts): este arquivo será sobrescrito.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Base = { id: string; user_id: string; created_at: string; updated_at: string };

/** Insert: campos com default (e os de Base) ficam opcionais. */
type ParaInsert<Row extends Base, ComDefault extends keyof Row> = Omit<Row, ComDefault | keyof Base> &
  Partial<Pick<Row, ComDefault | keyof Base>>;

type Rel<Nome extends string, Colunas extends string[], Tabela extends string> = {
  foreignKeyName: Nome;
  columns: Colunas;
  isOneToOne: false;
  referencedRelation: Tabela;
  referencedColumns: ["id", "user_id"];
};

type ConfiguracoesRow = Base & {
  tarifa_kwh: number;
  desperdicio_pct: number;
  taxa_falha_pct: number;
  valor_hora: number;
  preparo_min: number;
  acabamento_min_peca: number;
  embalagem_pedido: number;
  margem_pct: number;
  taxa_pagamento_pct: number;
  pedido_minimo: number;
  retorno_ativo: boolean;
  retorno_meses: number;
  retorno_horas_mes: number;
  validade_orcamento_dias: number;
  followup_dias: number;
  pintura_insumos_peca: number;
  pintura_min_peca: number;
  dados_iniciais_criados: boolean;
};

type ClientesRow = Base & {
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  observacoes: string | null;
};

type FilamentosRow = Base & {
  nome: string;
  tipo: string;
  marca: string | null;
  cor: string | null;
  preco_rolo: number;
  frete: number;
  peso_rolo_g: number;
  ativo: boolean;
};

type ImpressorasRow = Base & {
  nome: string;
  preco: number;
  vida_util_h: number;
  consumo_w: number;
  manutencao_h: number;
  ativo: boolean;
};

type InsumosRow = Base & {
  nome: string;
  unidade: string;
  preco_pago: number;
  qtd_embalagem: number | null;
  ativo: boolean;
};

type StatusOrcamento = "enviado" | "aprovado" | "recusado" | "entregue";

type OrcamentosRow = Base & {
  cliente_id: string | null;
  filamento_id: string | null;
  impressora_id: string | null;
  material: string;
  impressora_nome: string;
  peca: string;
  quantidade: number;
  pecas_por_mesa: number;
  gramas_por_mesa: number;
  horas_por_mesa: number;
  pintado: boolean;
  parametros: Json;
  custo_total: number;
  preco: number;
  lucro: number;
  detalhamento: Json;
  status: StatusOrcamento;
  status_alterado_em: string;
  horas_reais: number | null;
  gramas_reais: number | null;
  houve_falha: boolean | null;
  observacao_entrega: string | null;
};

type OrcamentoInsumosRow = Base & {
  orcamento_id: string;
  insumo_id: string | null;
  nome_snapshot: string;
  unidade: string;
  custo_unitario_snapshot: number;
  quantidade: number;
  base: string;
};

type Tabela<Row, Insert, Relationships extends unknown[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: Relationships;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      configuracoes: Tabela<ConfiguracoesRow, Partial<ConfiguracoesRow>>;
      clientes: Tabela<
        ClientesRow,
        ParaInsert<ClientesRow, "telefone" | "email" | "cidade" | "observacoes">
      >;
      filamentos: Tabela<
        FilamentosRow,
        ParaInsert<FilamentosRow, "tipo" | "marca" | "cor" | "frete" | "peso_rolo_g" | "ativo">
      >;
      impressoras: Tabela<ImpressorasRow, ParaInsert<ImpressorasRow, "manutencao_h" | "ativo">>;
      insumos: Tabela<InsumosRow, ParaInsert<InsumosRow, "qtd_embalagem" | "ativo">>;
      orcamentos: Tabela<
        OrcamentosRow,
        ParaInsert<
          OrcamentosRow,
          | "cliente_id"
          | "filamento_id"
          | "impressora_id"
          | "material"
          | "impressora_nome"
          | "pintado"
          | "status"
          | "status_alterado_em"
          | "horas_reais"
          | "gramas_reais"
          | "houve_falha"
          | "observacao_entrega"
        >,
        [
          Rel<"orcamentos_cliente_id_user_id_fkey", ["cliente_id", "user_id"], "clientes">,
          Rel<"orcamentos_filamento_id_user_id_fkey", ["filamento_id", "user_id"], "filamentos">,
          Rel<"orcamentos_impressora_id_user_id_fkey", ["impressora_id", "user_id"], "impressoras">,
        ]
      >;
      orcamento_insumos: Tabela<
        OrcamentoInsumosRow,
        ParaInsert<OrcamentoInsumosRow, "insumo_id">,
        [
          Rel<"orcamento_insumos_orcamento_id_user_id_fkey", ["orcamento_id", "user_id"], "orcamentos">,
          Rel<"orcamento_insumos_insumo_id_user_id_fkey", ["insumo_id", "user_id"], "insumos">,
        ]
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      criar_dados_iniciais: { Args: never; Returns: boolean };
      salvar_orcamento: { Args: { p_id?: string; p_dados: Json; p_insumos: Json }; Returns: string };
    };
    Enums: { status_orcamento: StatusOrcamento };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      status_orcamento: ["enviado", "aprovado", "recusado", "entregue"],
    },
  },
} as const;
