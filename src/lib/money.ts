/**
 * Arredonda valores monetários para 2 casas decimais sem propagação de erro de ponto flutuante.
 * Use APENAS no total final (após soma), nunca em valores intermediários.
 */
export const roundMoney = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

export const formatBRL = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
