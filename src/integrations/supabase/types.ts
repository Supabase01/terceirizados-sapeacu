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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_config: {
        Row: {
          id: string
          pin: string
        }
        Insert: {
          id?: string
          pin?: string
        }
        Update: {
          id?: string
          pin?: string
        }
        Relationships: []
      }
      adicionais: {
        Row: {
          ano: number | null
          ano_fim: number | null
          ativo: boolean
          colaborador_id: string | null
          created_at: string
          descricao: string
          escopo: string
          id: string
          mes: number | null
          mes_fim: number | null
          tipo: string
          unidade_id: string | null
          valor: number
        }
        Insert: {
          ano?: number | null
          ano_fim?: number | null
          ativo?: boolean
          colaborador_id?: string | null
          created_at?: string
          descricao: string
          escopo?: string
          id?: string
          mes?: number | null
          mes_fim?: number | null
          tipo?: string
          unidade_id?: string | null
          valor?: number
        }
        Update: {
          ano?: number | null
          ano_fim?: number | null
          ativo?: boolean
          colaborador_id?: string | null
          created_at?: string
          descricao?: string
          escopo?: string
          id?: string
          mes?: number | null
          mes_fim?: number | null
          tipo?: string
          unidade_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "adicionais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adicionais_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_anterior: Json | null
          dados_novo: Json | null
          id: string
          registro_id: string | null
          tabela: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anterior?: Json | null
          dados_novo?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anterior?: Json | null
          dados_novo?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cidades: {
        Row: {
          ativo: boolean
          created_at: string
          estado: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          estado?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          estado?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          ativo: boolean
          bairro: string | null
          banco: string | null
          beneficio_social: boolean
          cep: string | null
          cidade_id: string | null
          complemento: string | null
          conta: string | null
          cpf: string
          created_at: string
          data_admissao: string | null
          endereco: string | null
          funcao_id: string | null
          id: string
          lideranca_id: string | null
          lotacao_id: string | null
          matricula: string | null
          nome: string
          numero: string | null
          pix: string | null
          salario_base: number
          secretaria_id: string | null
          unidade_id: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          banco?: string | null
          beneficio_social?: boolean
          cep?: string | null
          cidade_id?: string | null
          complemento?: string | null
          conta?: string | null
          cpf: string
          created_at?: string
          data_admissao?: string | null
          endereco?: string | null
          funcao_id?: string | null
          id?: string
          lideranca_id?: string | null
          lotacao_id?: string | null
          matricula?: string | null
          nome: string
          numero?: string | null
          pix?: string | null
          salario_base?: number
          secretaria_id?: string | null
          unidade_id?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          banco?: string | null
          beneficio_social?: boolean
          cep?: string | null
          cidade_id?: string | null
          complemento?: string | null
          conta?: string | null
          cpf?: string
          created_at?: string
          data_admissao?: string | null
          endereco?: string | null
          funcao_id?: string | null
          id?: string
          lideranca_id?: string | null
          lotacao_id?: string | null
          matricula?: string | null
          nome?: string
          numero?: string | null
          pix?: string | null
          salario_base?: number
          secretaria_id?: string | null
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_lideranca_id_fkey"
            columns: ["lideranca_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_lotacao_id_fkey"
            columns: ["lotacao_id"]
            isOneToOne: false
            referencedRelation: "lotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      descontos: {
        Row: {
          ano: number | null
          ativo: boolean
          colaborador_id: string | null
          created_at: string
          descricao: string
          escopo: string
          id: string
          is_percentual: boolean
          mes: number | null
          unidade_id: string | null
          valor: number
        }
        Insert: {
          ano?: number | null
          ativo?: boolean
          colaborador_id?: string | null
          created_at?: string
          descricao: string
          escopo?: string
          id?: string
          is_percentual?: boolean
          mes?: number | null
          unidade_id?: string | null
          valor?: number
        }
        Update: {
          ano?: number | null
          ativo?: boolean
          colaborador_id?: string | null
          created_at?: string
          descricao?: string
          escopo?: string
          id?: string
          is_percentual?: boolean
          mes?: number | null
          unidade_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "descontos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descontos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      encargos: {
        Row: {
          ativo: boolean
          colaborador_id: string | null
          created_at: string
          escopo: string
          id: string
          nome: string
          percentual: number
          unidade_id: string | null
        }
        Insert: {
          ativo?: boolean
          colaborador_id?: string | null
          created_at?: string
          escopo?: string
          id?: string
          nome: string
          percentual?: number
          unidade_id?: string | null
        }
        Update: {
          ativo?: boolean
          colaborador_id?: string | null
          created_at?: string
          escopo?: string
          id?: string
          nome?: string
          percentual?: number
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encargos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encargos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_processamento: {
        Row: {
          ano: number
          bruto: number
          colaborador_id: string
          cpf: string
          created_at: string
          funcao: string | null
          id: string
          liquido: number
          lotacao: string | null
          mes: number
          nome: string
          salario_base: number
          secretaria: string | null
          status: string
          total_adicionais: number
          total_descontos: number
          total_encargos: number
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          ano: number
          bruto?: number
          colaborador_id: string
          cpf: string
          created_at?: string
          funcao?: string | null
          id?: string
          liquido?: number
          lotacao?: string | null
          mes: number
          nome: string
          salario_base?: number
          secretaria?: string | null
          status?: string
          total_adicionais?: number
          total_descontos?: number
          total_encargos?: number
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number
          bruto?: number
          colaborador_id?: string
          cpf?: string
          created_at?: string
          funcao?: string | null
          id?: string
          liquido?: number
          lotacao?: string | null
          mes?: number
          nome?: string
          salario_base?: number
          secretaria?: string | null
          status?: string
          total_adicionais?: number
          total_descontos?: number
          total_encargos?: number
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folha_processamento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_processamento_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      funcao_sistema_permissoes: {
        Row: {
          allowed: boolean
          funcao_sistema_id: string
          id: string
          module_name: string
          route_path: string
        }
        Insert: {
          allowed?: boolean
          funcao_sistema_id: string
          id?: string
          module_name: string
          route_path: string
        }
        Update: {
          allowed?: boolean
          funcao_sistema_id?: string
          id?: string
          module_name?: string
          route_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcao_sistema_permissoes_funcao_sistema_id_fkey"
            columns: ["funcao_sistema_id"]
            isOneToOne: false
            referencedRelation: "funcoes_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      funcoes: {
        Row: {
          ativo: boolean
          atribuicoes: string | null
          created_at: string
          id: string
          nome: string
          unidade_id: string | null
        }
        Insert: {
          ativo?: boolean
          atribuicoes?: string | null
          created_at?: string
          id?: string
          nome: string
          unidade_id?: string | null
        }
        Update: {
          ativo?: boolean
          atribuicoes?: string | null
          created_at?: string
          id?: string
          nome?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      funcoes_sistema: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      liderancas: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          id: string
          nome: string
          unidade_id: string | null
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          id?: string
          nome: string
          unidade_id?: string | null
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          id?: string
          nome?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liderancas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_sistema: {
        Row: {
          categoria: string
          created_at: string
          descricao: string
          detalhes: Json | null
          id: string
          tipo: string
          unidade_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          categoria?: string
          created_at?: string
          descricao: string
          detalhes?: Json | null
          id?: string
          tipo?: string
          unidade_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string
          detalhes?: Json | null
          id?: string
          tipo?: string
          unidade_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_sistema_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      lotacoes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          secretaria_id: string | null
          unidade_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          secretaria_id?: string | null
          unidade_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          secretaria_id?: string | null
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotacoes_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotacoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          ano: number
          bruto: number
          cpf: string
          created_at: string
          funcao: string
          id: string
          liquido: number
          mes: number
          nome: string
          pasta: string
          prefeitura: string
          unidade_id: string | null
        }
        Insert: {
          ano: number
          bruto?: number
          cpf: string
          created_at?: string
          funcao: string
          id?: string
          liquido?: number
          mes: number
          nome: string
          pasta: string
          prefeitura: string
          unidade_id?: string | null
        }
        Update: {
          ano?: number
          bruto?: number
          cpf?: string
          created_at?: string
          funcao?: string
          id?: string
          liquido?: number
          mes?: number
          nome?: string
          pasta?: string
          prefeitura?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      prefeituras: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          responsavel: string | null
          responsavel_cargo: string | null
          responsavel_cpf: string | null
          responsavel_email: string | null
          responsavel_telefone: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          responsavel?: string | null
          responsavel_cargo?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_telefone?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          responsavel_cargo?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_telefone?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string | null
          pin: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome?: string | null
          pin?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string | null
          pin?: string | null
        }
        Relationships: []
      }
      route_permissions: {
        Row: {
          allowed: boolean
          id: string
          module_name: string
          role: Database["public"]["Enums"]["app_role"]
          route_path: string
        }
        Insert: {
          allowed?: boolean
          id?: string
          module_name: string
          role: Database["public"]["Enums"]["app_role"]
          route_path: string
        }
        Update: {
          allowed?: boolean
          id?: string
          module_name?: string
          role?: Database["public"]["Enums"]["app_role"]
          route_path?: string
        }
        Relationships: []
      }
      secretarias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          unidade_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          unidade_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "secretarias_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
      terceirizadas: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          responsavel: string | null
          responsavel_cargo: string | null
          responsavel_cpf: string | null
          responsavel_email: string | null
          responsavel_telefone: string | null
          telefone: string | null
          tipo: string | null
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          responsavel?: string | null
          responsavel_cargo?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_telefone?: string | null
          telefone?: string | null
          tipo?: string | null
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          responsavel?: string | null
          responsavel_cargo?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_telefone?: string | null
          telefone?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      unidades_folha: {
        Row: {
          ativo: boolean
          cidade: string | null
          created_at: string
          estado: string | null
          id: string
          instituicao_id: string | null
          instituicao_tipo: string
          nome: string
          padrao: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          instituicao_id?: string | null
          instituicao_tipo?: string
          nome: string
          padrao?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          instituicao_id?: string | null
          instituicao_tipo?: string
          nome?: string
          padrao?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuario_funcoes_sistema: {
        Row: {
          funcao_sistema_id: string
          id: string
          user_id: string
        }
        Insert: {
          funcao_sistema_id: string
          id?: string
          user_id: string
        }
        Update: {
          funcao_sistema_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_funcoes_sistema_funcao_sistema_id_fkey"
            columns: ["funcao_sistema_id"]
            isOneToOne: false
            referencedRelation: "funcoes_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_permissoes: {
        Row: {
          allowed: boolean
          id: string
          module_name: string
          route_path: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          id?: string
          module_name: string
          route_path: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          id?: string
          module_name?: string
          route_path?: string
          user_id?: string
        }
        Relationships: []
      }
      usuario_unidades: {
        Row: {
          created_at: string
          id: string
          unidade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unidade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unidade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_unidades_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_folha"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_route: {
        Args: { _route: string; _user_id: string }
        Returns: boolean
      }
      get_user_allowed_routes: {
        Args: { _user_id: string }
        Returns: {
          module_name: string
          route_path: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      next_matricula: { Args: { _unidade_id: string }; Returns: string }
      set_user_pin: {
        Args: { _pin: string; _user_id: string }
        Returns: undefined
      }
      user_has_unidade_access: {
        Args: { _unidade_id: string; _user_id: string }
        Returns: boolean
      }
      validate_pin: { Args: { input_pin: string }; Returns: boolean }
      validate_user_pin: {
        Args: { _pin: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "usuario"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "usuario"],
    },
  },
} as const
