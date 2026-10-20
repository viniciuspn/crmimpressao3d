export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cidade: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          acabamento_min_peca: number
          created_at: string
          dados_iniciais_criados: boolean
          desperdicio_pct: number
          embalagem_pedido: number
          followup_dias: number
          id: string
          margem_pct: number
          pedido_minimo: number
          pintura_insumos_peca: number
          pintura_min_peca: number
          preparo_min: number
          retorno_ativo: boolean
          retorno_horas_mes: number
          retorno_meses: number
          tarifa_kwh: number
          taxa_falha_pct: number
          taxa_pagamento_pct: number
          updated_at: string
          user_id: string
          validade_orcamento_dias: number
          valor_hora: number
        }
        Insert: {
          acabamento_min_peca?: number
          created_at?: string
          dados_iniciais_criados?: boolean
          desperdicio_pct?: number
          embalagem_pedido?: number
          followup_dias?: number
          id?: string
          margem_pct?: number
          pedido_minimo?: number
          pintura_insumos_peca?: number
          pintura_min_peca?: number
          preparo_min?: number
          retorno_ativo?: boolean
          retorno_horas_mes?: number
          retorno_meses?: number
          tarifa_kwh?: number
          taxa_falha_pct?: number
          taxa_pagamento_pct?: number
          updated_at?: string
          user_id?: string
          validade_orcamento_dias?: number
          valor_hora?: number
        }
        Update: {
          acabamento_min_peca?: number
          created_at?: string
          dados_iniciais_criados?: boolean
          desperdicio_pct?: number
          embalagem_pedido?: number
          followup_dias?: number
          id?: string
          margem_pct?: number
          pedido_minimo?: number
          pintura_insumos_peca?: number
          pintura_min_peca?: number
          preparo_min?: number
          retorno_ativo?: boolean
          retorno_horas_mes?: number
          retorno_meses?: number
          tarifa_kwh?: number
          taxa_falha_pct?: number
          taxa_pagamento_pct?: number
          updated_at?: string
          user_id?: string
          validade_orcamento_dias?: number
          valor_hora?: number
        }
        Relationships: []
      }
      filamentos: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          frete: number
          id: string
          marca: string | null
          nome: string
          peso_rolo_g: number
          preco_rolo: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          frete?: number
          id?: string
          marca?: string | null
          nome: string
          peso_rolo_g?: number
          preco_rolo: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          frete?: number
          id?: string
          marca?: string | null
          nome?: string
          peso_rolo_g?: number
          preco_rolo?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      impressoras: {
        Row: {
          ativo: boolean
          consumo_w: number
          created_at: string
          id: string
          manutencao_h: number
          nome: string
          preco: number
          updated_at: string
          user_id: string
          vida_util_h: number
        }
        Insert: {
          ativo?: boolean
          consumo_w: number
          created_at?: string
          id?: string
          manutencao_h?: number
          nome: string
          preco: number
          updated_at?: string
          user_id?: string
          vida_util_h: number
        }
        Update: {
          ativo?: boolean
          consumo_w?: number
          created_at?: string
          id?: string
          manutencao_h?: number
          nome?: string
          preco?: number
          updated_at?: string
          user_id?: string
          vida_util_h?: number
        }
        Relationships: []
      }
      insumos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          preco_pago: number
          qtd_embalagem: number | null
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          preco_pago: number
          qtd_embalagem?: number | null
          unidade: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          preco_pago?: number
          qtd_embalagem?: number | null
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orcamento_insumos: {
        Row: {
          base: string
          created_at: string
          custo_unitario_snapshot: number
          id: string
          insumo_id: string | null
          nome_snapshot: string
          orcamento_id: string
          quantidade: number
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base: string
          created_at?: string
          custo_unitario_snapshot: number
          id?: string
          insumo_id?: string | null
          nome_snapshot: string
          orcamento_id: string
          quantidade: number
          unidade: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          base?: string
          created_at?: string
          custo_unitario_snapshot?: number
          id?: string
          insumo_id?: string | null
          nome_snapshot?: string
          orcamento_id?: string
          quantidade?: number
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_insumos_insumo_id_user_id_fkey"
            columns: ["insumo_id", "user_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "orcamento_insumos_orcamento_id_user_id_fkey"
            columns: ["orcamento_id", "user_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          cliente_id: string | null
          created_at: string
          custo_total: number
          detalhamento: Json
          filamento_id: string | null
          gramas_por_mesa: number
          gramas_reais: number | null
          horas_por_mesa: number
          horas_reais: number | null
          houve_falha: boolean | null
          id: string
          impressora_id: string | null
          impressora_nome: string
          lucro: number
          material: string
          observacao_entrega: string | null
          parametros: Json
          peca: string
          pecas_por_mesa: number
          pintado: boolean
          preco: number
          quantidade: number
          status: Database["public"]["Enums"]["status_orcamento"]
          status_alterado_em: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          custo_total: number
          detalhamento: Json
          filamento_id?: string | null
          gramas_por_mesa: number
          gramas_reais?: number | null
          horas_por_mesa: number
          horas_reais?: number | null
          houve_falha?: boolean | null
          id?: string
          impressora_id?: string | null
          impressora_nome?: string
          lucro: number
          material?: string
          observacao_entrega?: string | null
          parametros: Json
          peca: string
          pecas_por_mesa: number
          pintado?: boolean
          preco: number
          quantidade: number
          status?: Database["public"]["Enums"]["status_orcamento"]
          status_alterado_em?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          custo_total?: number
          detalhamento?: Json
          filamento_id?: string | null
          gramas_por_mesa?: number
          gramas_reais?: number | null
          horas_por_mesa?: number
          horas_reais?: number | null
          houve_falha?: boolean | null
          id?: string
          impressora_id?: string | null
          impressora_nome?: string
          lucro?: number
          material?: string
          observacao_entrega?: string | null
          parametros?: Json
          peca?: string
          pecas_por_mesa?: number
          pintado?: boolean
          preco?: number
          quantidade?: number
          status?: Database["public"]["Enums"]["status_orcamento"]
          status_alterado_em?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_user_id_fkey"
            columns: ["cliente_id", "user_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "orcamentos_filamento_id_user_id_fkey"
            columns: ["filamento_id", "user_id"]
            isOneToOne: false
            referencedRelation: "filamentos"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "orcamentos_impressora_id_user_id_fkey"
            columns: ["impressora_id", "user_id"]
            isOneToOne: false
            referencedRelation: "impressoras"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_dados_iniciais: { Args: never; Returns: boolean }
      salvar_orcamento: {
        Args: { p_dados: Json; p_id: string; p_insumos: Json }
        Returns: string
      }
    }
    Enums: {
      status_orcamento: "enviado" | "aprovado" | "recusado" | "entregue"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_orcamento: ["enviado", "aprovado", "recusado", "entregue"],
    },
  },
} as const
