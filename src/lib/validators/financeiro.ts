import { z } from 'zod';

const VALOR_MAX = 1_000_000;

const numberStr = z
  .string()
  .trim()
  .refine((v) => v === '' || !Number.isNaN(Number(v)), { message: 'Número inválido' });

const valorSchema = numberStr
  .refine((v) => v !== '', { message: 'Valor é obrigatório' })
  .refine((v) => Number(v) >= 0, { message: 'Valor não pode ser negativo' })
  .refine((v) => Number(v) <= VALOR_MAX, { message: `Valor máximo permitido é R$ ${VALOR_MAX.toLocaleString('pt-BR')}` })
  .refine((v) => /^-?\d+(\.\d{1,2})?$/.test(v), { message: 'Use no máximo 2 casas decimais' });

const percentualSchema = numberStr
  .refine((v) => v !== '', { message: 'Percentual é obrigatório' })
  .refine((v) => Number(v) > 0, { message: 'Percentual deve ser maior que zero' })
  .refine((v) => Number(v) <= 100, { message: 'Percentual não pode ultrapassar 100%' })
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), { message: 'Use no máximo 2 casas decimais' });

function validarMes(ctx: z.RefinementCtx, valor: string, path: (string | number)[]) {
  const mes = Number(valor);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'Mês deve ser entre 1 e 12' });
  }
}
function validarAno(ctx: z.RefinementCtx, valor: string, path: (string | number)[]) {
  const ano = Number(valor);
  if (!Number.isInteger(ano) || ano < 2020 || ano > 2099) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'Ano inválido' });
  }
}

/**
 * Schema base de regras financeiras (adicionais e descontos).
 * Escopo: global | grupo | individual
 *   - global: SEM colaborador
 *   - individual: EXATAMENTE 1 colaborador
 *   - grupo: 1 OU MAIS colaboradores
 * Tipo (vigência): recorrente | prazo | eventual
 *   - recorrente: SEM mes/ano
 *   - eventual: mes/ano obrigatório (competência única); SEM mes_fim/ano_fim
 *   - prazo: mes/ano início + mes_fim/ano_fim obrigatórios; fim ≥ início
 */
const baseRegraFinanceira = z.object({
  descricao: z.string().trim().min(1, 'Selecione uma rubrica').max(200, 'Máximo 200 caracteres'),
  escopo: z.enum(['global', 'grupo', 'individual']),
  colaborador_ids: z.array(z.string()).default([]),
  tipo: z.enum(['recorrente', 'prazo', 'eventual']),
  modo_calculo: z.enum(['fixo', 'percentual']),
  valor: z.string().trim(),
  percentual: z.string().trim(),
  base_calculo: z.string().trim(),
  mes: z.string().trim(),
  ano: z.string().trim(),
  mes_fim: z.string().trim(),
  ano_fim: z.string().trim(),
});

function refineRegra(
  data: z.infer<typeof baseRegraFinanceira>,
  ctx: z.RefinementCtx,
  opts: { allowedBases: string[] }
) {
  // ===== Escopo =====
  if (data.escopo === 'individual') {
    if (data.colaborador_ids.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['colaborador_ids'], message: 'Selecione um colaborador' });
    } else if (data.colaborador_ids.length > 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['colaborador_ids'], message: 'Individual aceita apenas um colaborador' });
    }
  } else if (data.escopo === 'grupo') {
    if (data.colaborador_ids.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['colaborador_ids'], message: 'Selecione pelo menos um colaborador' });
    }
  }
  // global: nada a validar

  // ===== Modo de cálculo =====
  if (data.modo_calculo === 'fixo') {
    const r = valorSchema.safeParse(data.valor);
    if (!r.success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['valor'], message: r.error.issues[0].message });
  } else {
    const r = percentualSchema.safeParse(data.percentual);
    if (!r.success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentual'], message: r.error.issues[0].message });
    if (!data.base_calculo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base_calculo'], message: 'Selecione a base de cálculo' });
    } else if (!opts.allowedBases.includes(data.base_calculo)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base_calculo'], message: 'Base de cálculo inválida' });
    }
  }

  // ===== Vigência por tipo =====
  if (data.tipo === 'recorrente') {
    // nada
  } else if (data.tipo === 'eventual') {
    if (data.mes === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mes'], message: 'Mês obrigatório' });
    else validarMes(ctx, data.mes, ['mes']);
    if (data.ano === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ano'], message: 'Ano obrigatório' });
    else validarAno(ctx, data.ano, ['ano']);
  } else if (data.tipo === 'prazo') {
    if (data.mes === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mes'], message: 'Mês de início obrigatório' });
    else validarMes(ctx, data.mes, ['mes']);
    if (data.ano === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ano'], message: 'Ano de início obrigatório' });
    else validarAno(ctx, data.ano, ['ano']);
    if (data.mes_fim === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mes_fim'], message: 'Mês de fim obrigatório' });
    else validarMes(ctx, data.mes_fim, ['mes_fim']);
    if (data.ano_fim === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ano_fim'], message: 'Ano de fim obrigatório' });
    else validarAno(ctx, data.ano_fim, ['ano_fim']);
    if (data.mes && data.ano && data.mes_fim && data.ano_fim) {
      const ini = Number(data.ano) * 100 + Number(data.mes);
      const fim = Number(data.ano_fim) * 100 + Number(data.mes_fim);
      if (fim < ini) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mes_fim'], message: 'Fim deve ser igual ou posterior ao início' });
      }
    }
  }
}

export const adicionalSchema = baseRegraFinanceira.superRefine((data, ctx) =>
  refineRegra(data, ctx, { allowedBases: ['salario_base', 'bruto', 'liquido'] })
);

export const descontoSchema = baseRegraFinanceira
  .extend({ is_percentual: z.boolean().default(false) })
  .superRefine((data, ctx) =>
    // Descontos: 'liquido' bloqueado para evitar dependência circular
    refineRegra(data, ctx, { allowedBases: ['salario_base', 'bruto'] })
  );

export type AdicionalInput = z.infer<typeof adicionalSchema>;
export type DescontoInput = z.infer<typeof descontoSchema>;

/** Converte erros do Zod em mapa { campo: mensagem } para uso em UI inline */
export function zodErrorMap(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}
