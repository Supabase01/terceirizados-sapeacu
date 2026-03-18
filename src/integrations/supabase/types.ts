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
      colaboradores: {
        Row: {
          adicionais: number
          ativo: boolean
          cpf: string
          created_at: string
          data_admissao: string | null
          encargo: number
          funcao_id: string | null
          id: string
          lotacao_id: string | null
          matricula: string | null
          nome: string
          salario_bruto: number
          salario_liquido: number
          secretaria_id: string | null
        }
        Insert: {
          adicionais?: number
          ativo?: boolean
          cpf: string
          created_at?: string
          data_admissao?: string | null
          encargo?: number
          funcao_id?: string | null
          id?: string
          lotacao_id?: string | null
          matricula?: string | null
          nome: string
          salario_bruto?: number
          salario_liquido?: number
          secretaria_id?: string | null
        }
        Update: {
          adicionais?: number
          ativo?: boolean
          cpf?: string
          created_at?: string
          data_admissao?: string | null
          encargo?: number
          funcao_id?: string | null
          id?: string
          lotacao_id?: string | null
          matricula?: string | null
          nome?: string
          salario_bruto?: number
          salario_liquido?: number
          secretaria_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
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
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
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
      lotacoes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          secretaria_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          secretaria_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          secretaria_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotacoes_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
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
        }
        Relationships: []
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
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
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
          telefone?: string | null
          tipo?: string | null
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
      set_user_pin: {
        Args: { _pin: string; _user_id: string }
        Returns: undefined
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
