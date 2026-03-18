import * as XLSX from 'xlsx';

export interface ParsedRecord {
  prefeitura: string;
  pasta: string;
  ano: number;
  mes: number;
  nome: string;
  funcao: string;
  cpf: string;
  salario_base: number;
  adicionais: number;
  descontos: number;
  bruto: number;
  liquido: number;
}

const REQUIRED_COLUMNS = ['PREFEITURA', 'PASTA', 'ANO', 'MÊS', 'NOME', 'FUNÇÃO', 'CPF', 'SALÁRIO BASE', 'ADICIONAIS', 'DESCONTOS', 'BRUTO', 'LÍQUIDO'];

const normalizeHeader = (header: string): string =>
  header.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const COLUMN_MAP: Record<string, keyof ParsedRecord> = {
  PREFEITURA: 'prefeitura',
  PASTA: 'pasta',
  ANO: 'ano',
  MES: 'mes',
  NOME: 'nome',
  FUNCAO: 'funcao',
  CPF: 'cpf',
  'SALARIO BASE': 'salario_base',
  ADICIONAIS: 'adicionais',
  DESCONTOS: 'descontos',
  BRUTO: 'bruto',
  LIQUIDO: 'liquido',
};

export interface ParseResult {
  success: boolean;
  data: ParsedRecord[];
  errors: string[];
  totalRows: number;
}

const parseNum = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const n = parseFloat(String(val || '0').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

export const parseFile = async (file: File): Promise<ParseResult> => {
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

    const records: ParsedRecord[] = [];
    rawData.forEach((row, index) => {
      try {
        const record: any = {};
        Object.entries(headerMap).forEach(([rawKey, mappedKey]) => {
          record[mappedKey] = row[rawKey];
        });

        record.salario_base = parseNum(record.salario_base);
        record.adicionais = parseNum(record.adicionais);
        record.descontos = parseNum(record.descontos);
        record.bruto = parseNum(record.bruto);
        record.liquido = parseNum(record.liquido);
        record.ano = Number(record.ano) || 0;
        record.mes = Number(record.mes) || 0;
        record.cpf = String(record.cpf || '').replace(/\D/g, '');
        record.nome = String(record.nome || '').trim();
        record.funcao = String(record.funcao || '').trim();
        record.prefeitura = String(record.prefeitura || '').trim();
        record.pasta = String(record.pasta || '').trim();

        if (record.nome && record.cpf) records.push(record as ParsedRecord);
      } catch {
        errors.push(`Erro na linha ${index + 2}`);
      }
    });

    return { success: true, data: records, errors, totalRows: records.length };
  } catch {
    return { success: false, data: [], errors: ['Erro ao ler o arquivo. Verifique o formato.'], totalRows: 0 };
  }
};
