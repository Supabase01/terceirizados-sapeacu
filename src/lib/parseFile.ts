import * as XLSX from 'xlsx';
import type { PayrollRecord } from '@/types/payroll';

const REQUIRED_COLUMNS = ['PREFEITURA', 'PASTA', 'ANO', 'MÊS', 'NOME', 'FUNÇÃO', 'CPF', 'BRUTO', 'LÍQUIDO'];

const normalizeHeader = (header: string): string => {
  return header
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const COLUMN_MAP: Record<string, keyof PayrollRecord> = {
  PREFEITURA: 'prefeitura',
  PASTA: 'pasta',
  ANO: 'ano',
  MES: 'mes',
  NOME: 'nome',
  FUNCAO: 'funcao',
  CPF: 'cpf',
  BRUTO: 'bruto',
  LIQUIDO: 'liquido',
};

export interface ParseResult {
  success: boolean;
  data: PayrollRecord[];
  errors: string[];
  totalRows: number;
}

export const parseFile = async (file: File): Promise<ParseResult> => {
  const errors: string[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (rawData.length === 0) {
      return { success: false, data: [], errors: ['Arquivo vazio ou sem dados válidos.'], totalRows: 0 };
    }

    // Validate headers
    const rawHeaders = Object.keys(rawData[0]);
    const normalizedHeaders = rawHeaders.map(normalizeHeader);
    const normalizedRequired = REQUIRED_COLUMNS.map(c => normalizeHeader(c));

    const missing = normalizedRequired.filter(req => !normalizedHeaders.some(h => h === req));
    if (missing.length > 0) {
      return {
        success: false,
        data: [],
        errors: [`Colunas obrigatórias ausentes: ${missing.join(', ')}`],
        totalRows: 0,
      };
    }

    // Build header mapping
    const headerMap: Record<string, string> = {};
    rawHeaders.forEach((raw, i) => {
      const normalized = normalizedHeaders[i];
      if (COLUMN_MAP[normalized]) {
        headerMap[raw] = COLUMN_MAP[normalized];
      }
    });

    const records: PayrollRecord[] = [];
    rawData.forEach((row, index) => {
      try {
        const record: any = {};
        Object.entries(headerMap).forEach(([rawKey, mappedKey]) => {
          record[mappedKey] = row[rawKey];
        });

        record.bruto = typeof record.bruto === 'number' ? record.bruto : parseFloat(String(record.bruto || '0').replace(/[^\d.,-]/g, '').replace(',', '.'));
        record.liquido = typeof record.liquido === 'number' ? record.liquido : parseFloat(String(record.liquido || '0').replace(/[^\d.,-]/g, '').replace(',', '.'));
        record.ano = Number(record.ano);
        record.mes = Number(record.mes);
        record.cpf = String(record.cpf || '').replace(/\D/g, '');
        record.nome = String(record.nome || '').trim();
        record.funcao = String(record.funcao || '').trim();
        record.prefeitura = String(record.prefeitura || '').trim();
        record.pasta = String(record.pasta || '').trim();

        if (record.nome && record.cpf) {
          records.push(record as PayrollRecord);
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
