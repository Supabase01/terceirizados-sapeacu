import * as XLSX from 'xlsx';
import { isValidCPF } from './cpf';

export interface ParsedColaborador {
  nome: string;
  cpf: string;
  matricula: string;
  secretaria: string;
  funcao: string;
  lotacao: string;
  lideranca: string;
  salario_base: number;
  data_admissao: string;
  beneficio_social: boolean;
  banco: string;
  conta: string;
  pix: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;
}

export interface ParseColaboradoresResult {
  success: boolean;
  data: ParsedColaborador[];
  errors: string[];
  totalRows: number;
}

const REQUIRED_COLUMNS = ['NOME', 'CPF'];

const TEMPLATE_HEADERS = [
  'NOME', 'CPF', 'MATRÍCULA', 'SECRETARIA', 'FUNÇÃO', 'LOTAÇÃO', 'LIDERANÇA',
  'SALÁRIO BASE', 'DATA ADMISSÃO', 'BENEFÍCIO SOCIAL', 'BANCO', 'CONTA', 'PIX',
  'ENDEREÇO', 'NÚMERO', 'COMPLEMENTO', 'BAIRRO', 'CIDADE', 'CEP',
];

export { TEMPLATE_HEADERS as COLABORADOR_TEMPLATE_HEADERS };

const normalizeHeader = (header: string): string =>
  header.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const COLUMN_MAP: Record<string, keyof ParsedColaborador> = {
  NOME: 'nome',
  CPF: 'cpf',
  MATRICULA: 'matricula',
  SECRETARIA: 'secretaria',
  FUNCAO: 'funcao',
  LOTACAO: 'lotacao',
  LIDERANCA: 'lideranca',
  'SALARIO BASE': 'salario_base',
  'DATA ADMISSAO': 'data_admissao',
  'BENEFICIO SOCIAL': 'beneficio_social',
  BANCO: 'banco',
  CONTA: 'conta',
  PIX: 'pix',
  ENDERECO: 'endereco',
  NUMERO: 'numero',
  COMPLEMENTO: 'complemento',
  BAIRRO: 'bairro',
  CIDADE: 'cidade',
  CEP: 'cep',
};

const parseNum = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const n = parseFloat(String(val || '0').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

const parseBool = (val: any): boolean => {
  if (typeof val === 'boolean') return val;
  const s = String(val || '').trim().toLowerCase();
  return ['sim', 'yes', 'true', '1', 's'].includes(s);
};

export const parseColaboradoresFile = async (file: File): Promise<ParseColaboradoresResult> => {
  const errors: string[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (rawData.length === 0) {
      return { success: false, data: [], errors: ['Arquivo vazio ou sem dados válidos.'], totalRows: 0 };
    }

    const rawHeaders = Object.keys(rawData[0]);
    const normalizedHeaders = rawHeaders.map(normalizeHeader);
    const normalizedRequired = REQUIRED_COLUMNS.map(normalizeHeader);

    const missing = normalizedRequired.filter(req => !normalizedHeaders.some(h => h === req));
    if (missing.length > 0) {
      return { success: false, data: [], errors: [`Colunas obrigatórias ausentes: ${missing.join(', ')}`], totalRows: 0 };
    }

    const headerMap: Record<string, string> = {};
    rawHeaders.forEach((raw, i) => {
      const normalized = normalizedHeaders[i];
      if (COLUMN_MAP[normalized]) headerMap[raw] = COLUMN_MAP[normalized];
    });

    const records: ParsedColaborador[] = [];
    rawData.forEach((row, index) => {
      try {
        const record: any = {};
        Object.entries(headerMap).forEach(([rawKey, mappedKey]) => {
          record[mappedKey] = row[rawKey];
        });

        record.nome = String(record.nome || '').trim();
        record.cpf = String(record.cpf || '').replace(/\D/g, '');
        record.matricula = String(record.matricula || '').trim();
        record.secretaria = String(record.secretaria || '').trim();
        record.funcao = String(record.funcao || '').trim();
        record.lotacao = String(record.lotacao || '').trim();
        record.lideranca = String(record.lideranca || '').trim();
        record.salario_base = parseNum(record.salario_base);
        record.data_admissao = String(record.data_admissao || '').trim();
        record.beneficio_social = parseBool(record.beneficio_social);
        record.banco = String(record.banco || '').trim();
        record.conta = String(record.conta || '').trim();
        record.pix = String(record.pix || '').trim();
        record.endereco = String(record.endereco || '').trim();
        record.numero = String(record.numero || '').trim();
        record.complemento = String(record.complemento || '').trim();
        record.bairro = String(record.bairro || '').trim();
        record.cidade = String(record.cidade || '').trim();
        record.cep = String(record.cep || '').replace(/\D/g, '');

        if (!record.nome || !record.cpf) {
          errors.push(`Linha ${index + 2}: Nome ou CPF ausente.`);
        } else if (!isValidCPF(record.cpf)) {
          errors.push(`Linha ${index + 2}: CPF inválido (${record.cpf}).`);
        } else {
          records.push(record as ParsedColaborador);
        }
      } catch {
        errors.push(`Erro na linha ${index + 2}`);
      }
    });

    return { success: true, data: records, errors, totalRows: records.length };
  } catch {
    return { success: false, data: [], errors: ['Erro ao ler o arquivo. Verifique o formato.'], totalRows: 0 };
  }
};
