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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          area: string | null
          atualizado_em: string | null
          cancel_token_hash: string | null
          cpf_hash: string
          criado_em: string | null
          data: string
          horario: string
          id: string
          nome: string
          status: string | null
        }
        Insert: {
          area?: string | null
          atualizado_em?: string | null
          cancel_token_hash?: string | null
          cpf_hash: string
          criado_em?: string | null
          data: string
          horario: string
          id?: string
          nome: string
          status?: string | null
        }
        Update: {
          area?: string | null
          atualizado_em?: string | null
          cancel_token_hash?: string | null
          cpf_hash?: string
          criado_em?: string | null
          data?: string
          horario?: string
          id?: string
          nome?: string
          status?: string | null
        }
        Relationships: []
      }
      configuracoes_disponibilidade: {
        Row: {
          atualizado_em: string | null
          dias_da_semana: string[]
          duracao_sessao: number
          hora_fim: string
          hora_inicio: string
          id: string
          intervalo: number
          pausa_almoco_ativa: boolean | null
          pausa_almoco_fim: string | null
          pausa_almoco_inicio: string | null
          vagas_por_horario: number
        }
        Insert: {
          atualizado_em?: string | null
          dias_da_semana?: string[]
          duracao_sessao: number
          hora_fim: string
          hora_inicio: string
          id?: string
          intervalo: number
          pausa_almoco_ativa?: boolean | null
          pausa_almoco_fim?: string | null
          pausa_almoco_inicio?: string | null
          vagas_por_horario: number
        }
        Update: {
          atualizado_em?: string | null
          dias_da_semana?: string[]
          duracao_sessao?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo?: number
          pausa_almoco_ativa?: boolean | null
          pausa_almoco_fim?: string | null
          pausa_almoco_inicio?: string | null
          vagas_por_horario?: number
        }
        Relationships: []
      }
      cpf_habilitado: {
        Row: {
          area: string | null
          cpf_hash: string
          criado_em: string | null
          id: string
          nome: string
        }
        Insert: {
          area?: string | null
          cpf_hash: string
          criado_em?: string | null
          id?: string
          nome: string
        }
        Update: {
          area?: string | null
          cpf_hash?: string
          criado_em?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      datas_disponiveis: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          data: string
          id: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          data: string
          id?: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          data?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validar_cpf_publico: {
        Args: {
          cpf_param: string
        }
        Returns: {
          area: string
          cpf: string
          nome: string
        }[]
      }
      consultar_agendamentos_cpf: {
        Args: {
          cpf_busca: string
        }
        Returns: Database["public"]["Tables"]["agendamentos"]["Row"][]
      }
      cancelar_agendamento_usuario: {
        Args: {
          agendamento_id: string
          cpf_confirmacao: string
        }
        Returns: Json
      }
      manage_cpf_habilitado: {
        Args: {
          action_type: string
          cpf_param: string
          nome_param?: string | null
          area_param?: string | null
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
    Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
    Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof Database["public"]["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof Database["public"]["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof Database["public"]["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof Database["public"]["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
  ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
