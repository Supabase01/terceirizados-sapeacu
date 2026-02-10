export interface PayrollRecord {
  id?: string;
  prefeitura: string;
  pasta: string;
  ano: number;
  mes: number;
  nome: string;
  funcao: string;
  cpf: string;
  bruto: number;
  liquido: number;
  created_at?: string;
}

export interface AuditAlert {
  type: 'cpf_cruzamento' | 'variacao' | 'inconsistencia' | 'fantasma';
  severity: 'alta' | 'media' | 'baixa';
  title: string;
  description: string;
  records: PayrollRecord[];
}

export interface DashboardFilters {
  ano: number | null;
  mes: number | null;
  pasta: string | null;
  search: string;
}
