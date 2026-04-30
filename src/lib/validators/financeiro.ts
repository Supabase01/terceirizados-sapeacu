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

const mesAnoOpcional = z.object({
  mes: z.string().trim(),
  ano: z.string().trim(),
}).superRefine((val, ctx) => {
  const mesPreenchido = val.mes !== '';
  const anoPreenchido = val.ano !== '';
  if (mesPreenchido !== anoPreenchido) {
    if (!mesPreenchido) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mes'], message: 'Preencha o mês junto com o ano' });
    if (!anoPreenchido) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ano'], message: 'Preencha o ano junto com o mês' });
    return;
  }
  if (mesPreenchido) {
    const mes = Number(val.mes);
    const ano = Number(val.ano);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mes'], message: 'Mês deve ser entre 1 e 12' });
    }
    if (!Number.isInteger(ano) || ano < 2020 || ano > 2099) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ano'], message: 'Ano inválido' });
    }
  }
});

export const adicionalSchema = z
  .object({
    descricao: z.string().trim().min(1, 'Selecione uma rubrica').max(200, 'Máximo 200 caracteres'),
    escopo: z.enum(['global', 'individual']),
    colaborador_ids: z.array(z.string()).default([]),
    tipo: z.enum(['fixo', 'eventual']),
    modo_calculo: z.enum(['fixo', 'percentual']),
    valor: z.string().trim(),
    percentual: z.string().trim(),
    base_calculo: z.string().trim(),
    mes: z.string().trim(),
    ano: z.string().trim(),
    mes_fim: z.string().trim(),
    ano_fim: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    // Escopo individual exige colaborador
    if (data.escopo === 'individual' && data.colaborador_ids.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['colaborador_ids'], message: 'Selecione pelo menos um colaborador' });
    }
    // Valor / percentual conforme modo
    if (data.modo_calculo === 'fixo') {
      const r = valorSchema.safeParse(data.valor);
      if (!r.success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['valor'], message: r.error.issues[0].message });
    } else {
      const r = percentualSchema.safeParse(data.percentual);
      if (!r.success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentual'], message: r.error.issues[0].message });
      if (!data.base_calculo || data.base_calculo === 'outra') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base_calculo'], message: 'Selecione a base de cálculo' });
      }
    }
    // Vigência (eventual)
    if (data.tipo === 'eventual') {
      const ini = mesAnoOpcional.safeParse({ mes: data.mes, ano: data.ano });
      if (!ini.success) {
        ini.error.issues.forEach((i) =>
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: i.path, message: i.message })
        );
      }
      // Eventual exige início obrigatório
      if (data.mes === '' || data.ano === '') {
        if (data.mes === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mes'], message: 'Mês de início obrigatório para eventual' });
        if (data.ano === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ano'], message: 'Ano de início obrigatório para eventual' });
      }
      // Vigência fim opcional, mas se preenchida deve ser completa
      const fim = mesAnoOpcional.safeParse({ mes: data.mes_fim, ano: data.ano_fim });
      if (!fim.success) {
        fim.error.issues.forEach((i) =>
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: i.path[0] === 'mes' ? ['mes_fim'] : ['ano_fim'], message: i.message })
        );
      }
      // Fim ≥ Início
      if (data.mes && data.ano && data.mes_fim && data.ano_fim) {
        const ini = Number(data.ano) * 100 + Number(data.mes);
        const fim = Number(data.ano_fim) * 100 + Number(data.mes_fim);
        if (fim < ini) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mes_fim'], message: 'Fim deve ser igual ou posterior ao início' });
        }
      }
    }
  });

export const descontoSchema = z
  .object({
    descricao: z.string().trim().min(1, 'Selecione uma rubrica').max(200, 'Máximo 200 caracteres'),
    escopo: z.enum(['global', 'individual']),
    colaborador_ids: z.array(z.string()).default([]),
    modo_calculo: z.enum(['fixo', 'percentual']),
    valor: z.string().trim(),
    percentual: z.string().trim(),
    base_calculo: z.string().trim(),
    is_percentual: z.boolean().default(false),
    mes: z.string().trim(),
    ano: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (data.escopo === 'individual' && data.colaborador_ids.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['colaborador_ids'], message: 'Selecione pelo menos um colaborador' });
    }
    if (data.modo_calculo === 'fixo') {
      const r = valorSchema.safeParse(data.valor);
      if (!r.success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['valor'], message: r.error.issues[0].message });
    } else {
      const r = percentualSchema.safeParse(data.percentual);
      if (!r.success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['percentual'], message: r.error.issues[0].message });
      if (!data.base_calculo) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base_calculo'], message: 'Selecione a base de cálculo' });
      } else if (!['salario_base', 'bruto'].includes(data.base_calculo)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base_calculo'], message: 'Base inválida (apenas Salário Base ou Bruto)' });
      }
    }
    // Vigência opcional, mas se preenchida deve ser completa
    const r = mesAnoOpcional.safeParse({ mes: data.mes, ano: data.ano });
    if (!r.success) {
      r.error.issues.forEach((i) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: i.path, message: i.message })
      );
    }
  });

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
