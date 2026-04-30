// Utilitários de CPF: limpeza, formatação e validação por dígitos verificadores.

export function cleanCPF(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export function formatCPF(value: string): string {
  const d = cleanCPF(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

/** Valida CPF pelo algoritmo oficial dos dígitos verificadores. */
export function isValidCPF(value: string): boolean {
  const cpf = cleanCPF(value);
  if (cpf.length !== 11) return false;
  // Rejeita sequências inválidas conhecidas (todos os dígitos iguais).
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcCheck = (slice: string, factorStart: number) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += parseInt(slice[i], 10) * (factorStart - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calcCheck(cpf.slice(0, 9), 10);
  if (d1 !== parseInt(cpf[9], 10)) return false;
  const d2 = calcCheck(cpf.slice(0, 10), 11);
  if (d2 !== parseInt(cpf[10], 10)) return false;
  return true;
}
