import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ArrowDown, ArrowUp, Calculator, Wallet, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatBRL = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const monthName = (m: number) =>
  ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m-1] || '';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registro: any | null;
  unidadeId: string;
  isPadrao02: boolean;
}

interface Linha {
  descricao: string;
  detalhe?: string;
  valor: number;
}

const ContrachequeDetalhado = ({ open, onOpenChange, registro, unidadeId, isPadrao02 }: Props) => {
  const enabled = !!(open && registro && unidadeId);

  const { data, isLoading } = useQuery({
    queryKey: ['contracheque-detalhe', registro?.id, registro?.colaborador_id, registro?.mes, registro?.ano, unidadeId],
    queryFn: async () => {
      const colId = registro.colaborador_id;
      const mes = registro.mes;
      const ano = registro.ano;
      const salarioBase = Number(registro.salario_base) || 0;

      // Fetch in parallel
      const [adicionaisRes, descontosRes, encargosRes, freqRes] = await Promise.all([
        supabase.from('adicionais').select('*').eq('ativo', true).eq('unidade_id', unidadeId)
          .or(`colaborador_id.eq.${colId},and(escopo.eq.global,colaborador_id.is.null)`),
        supabase.from('descontos').select('*').eq('ativo', true).eq('unidade_id', unidadeId)
          .or(`colaborador_id.eq.${colId},and(escopo.eq.global,colaborador_id.is.null)`),
        isPadrao02
          ? supabase.from('encargos').select('*').eq('ativo', true).eq('unidade_id', unidadeId)
              .or(`colaborador_id.eq.${colId},escopo.eq.global`)
          : Promise.resolve({ data: [], error: null } as any),
        supabase.from('frequencias').select('faltas').eq('unidade_id', unidadeId)
          .eq('colaborador_id', colId).eq('mes', mes).eq('ano', ano).maybeSingle(),
      ]);

      const current = ano * 100 + mes;
      const isVigente = (r: any) => {
        const tipo = r.tipo || 'recorrente';
        if (tipo === 'recorrente' || tipo === 'fixo') {
          if (!r.ano && !r.mes) return true;
          const inicio = (r.ano ?? 0) * 100 + (r.mes ?? 0);
          const fim = (r.ano_fim ?? r.ano ?? 9999) * 100 + (r.mes_fim ?? r.mes ?? 12);
          return current >= inicio && current <= fim;
        }
        if (tipo === 'eventual') return r.mes === mes && r.ano === ano;
        if (tipo === 'prazo') {
          const inicio = (r.ano ?? 0) * 100 + (r.mes ?? 0);
          const fim = (r.ano_fim ?? 9999) * 100 + (r.mes_fim ?? 12);
          return current >= inicio && current <= fim;
        }
        return false;
      };

      const faltas = Number((freqRes as any)?.data?.faltas) || 0;

      // Build adicionais lines (Padrão 01)
      const adicionaisLinhas: Linha[] = [];
      let totalAdicionais = 0;
      if (!isPadrao02) {
        const adicionais = (adicionaisRes.data || []).filter(isVigente);
        adicionais.forEach((a: any) => {
          let valor = 0;
          let detalhe = '';
          if (a.modo_calculo === 'percentual') {
            const pct = Number(a.percentual) || 0;
            valor = salarioBase * pct / 100;
            detalhe = `${pct}% sobre salário base`;
          } else {
            valor = Number(a.valor) || 0;
          }
          totalAdicionais += valor;
          adicionaisLinhas.push({
            descricao: a.descricao,
            detalhe: detalhe || (a.escopo === 'global' ? 'Global' : undefined),
            valor,
          });
        });
      }

      const bruto = isPadrao02 ? Number(registro.bruto) : salarioBase + totalAdicionais;

      // Descontos lines
      const descontosLinhas: Linha[] = [];
      let totalDescontos = 0;
      if (!isPadrao02) {
        const descontos = (descontosRes.data || []).filter(isVigente);
        descontos.forEach((d: any) => {
          let valor = 0;
          let detalhe = '';
          if (d.modo_calculo === 'percentual') {
            const pct = Number(d.percentual) || 0;
            const base = d.base_calculo === 'bruto' ? bruto : salarioBase;
            valor = base * pct / 100;
            detalhe = `${pct}% sobre ${d.base_calculo === 'bruto' ? 'bruto' : 'salário base'}`;
          } else if (d.is_percentual) {
            valor = bruto * Number(d.valor) / 100;
            detalhe = `${d.valor}% sobre bruto`;
          } else {
            valor = Number(d.valor) || 0;
          }
          totalDescontos += valor;
          descontosLinhas.push({
            descricao: d.descricao,
            detalhe: detalhe || (d.escopo === 'global' ? 'Global' : undefined),
            valor,
          });
        });
      }

      // Faltas
      if (faltas > 0) {
        const valorFalta = (bruto / 30) * faltas;
        descontosLinhas.push({
          descricao: `Faltas (${faltas} ${faltas === 1 ? 'dia' : 'dias'})`,
          detalhe: `${formatBRL(bruto)} ÷ 30 × ${faltas}`,
          valor: valorFalta,
        });
        totalDescontos += valorFalta;
      }

      // Encargos (Padrão 02)
      const encargosLinhas: Linha[] = [];
      let totalEncargos = 0;
      if (isPadrao02) {
        const encargos = (encargosRes.data || []) as any[];
        encargos.forEach((e: any) => {
          const pct = Number(e.percentual) || 0;
          const valor = salarioBase * pct / 100;
          totalEncargos += valor;
          encargosLinhas.push({
            descricao: e.nome,
            detalhe: `${pct}% sobre líquido (${formatBRL(salarioBase)})`,
            valor,
          });
        });
      }

      return {
        salarioBase,
        adicionaisLinhas,
        totalAdicionais,
        descontosLinhas,
        totalDescontos,
        encargosLinhas,
        totalEncargos,
        bruto,
        liquido: Number(registro.liquido),
        faltas,
      };
    },
    enabled,
  });

  if (!registro) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Contracheque Detalhado
          </DialogTitle>
        </DialogHeader>

        {/* Header info */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Colaborador</p>
              <p className="font-semibold text-base">{registro.nome}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{registro.cpf}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Competência</p>
              <p className="font-semibold">{monthName(registro.mes)} / {registro.ano}</p>
              <Badge variant="outline" className="mt-1 text-[10px]">{isPadrao02 ? 'Padrão 02' : 'Padrão 01'}</Badge>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Função:</span> <span className="font-medium">{registro.funcao || '—'}</span></div>
            <div><span className="text-muted-foreground">Secretaria:</span> <span className="font-medium">{registro.secretaria || '—'}</span></div>
            <div className="col-span-2"><span className="text-muted-foreground">Lotação:</span> <span className="font-medium">{registro.lotacao || '—'}</span></div>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {/* Padrão 01 */}
            {!isPadrao02 && (
              <>
                {/* Base + Adicionais → Bruto */}
                <section className="rounded-lg border">
                  <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border-b flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Proventos</span>
                  </div>
                  <div className="divide-y">
                    <LinhaRow descricao="Salário Base" valor={data.salarioBase} />
                    {data.adicionaisLinhas.map((l, i) => (
                      <LinhaRow key={i} descricao={l.descricao} detalhe={l.detalhe} valor={l.valor} />
                    ))}
                    {data.adicionaisLinhas.length === 0 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground italic">Sem adicionais</div>
                    )}
                  </div>
                  <div className="px-4 py-2 bg-muted/40 border-t flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1.5"><Calculator className="h-3.5 w-3.5" />Salário Bruto</span>
                    <span className="font-bold tabular-nums">{formatBRL(data.bruto)}</span>
                  </div>
                </section>

                {/* Descontos */}
                <section className="rounded-lg border">
                  <div className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 border-b flex items-center gap-2">
                    <ArrowDown className="h-4 w-4 text-rose-600" />
                    <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">Descontos</span>
                  </div>
                  <div className="divide-y">
                    {data.descontosLinhas.map((l, i) => (
                      <LinhaRow key={i} descricao={l.descricao} detalhe={l.detalhe} valor={l.valor} negativo />
                    ))}
                    {data.descontosLinhas.length === 0 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground italic">Sem descontos</div>
                    )}
                  </div>
                  <div className="px-4 py-2 bg-muted/40 border-t flex items-center justify-between">
                    <span className="text-sm font-medium">Total de Descontos</span>
                    <span className="font-bold tabular-nums text-rose-600">- {formatBRL(data.totalDescontos)}</span>
                  </div>
                </section>
              </>
            )}

            {/* Padrão 02 */}
            {isPadrao02 && (
              <>
                <section className="rounded-lg border">
                  <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border-b flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Líquido Contratado</span>
                  </div>
                  <div className="divide-y">
                    <LinhaRow descricao="Salário Líquido (base)" valor={data.salarioBase} />
                  </div>
                </section>

                <section className="rounded-lg border">
                  <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 border-b flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Encargos sobre o Líquido</span>
                  </div>
                  <div className="divide-y">
                    {data.encargosLinhas.map((l, i) => (
                      <LinhaRow key={i} descricao={l.descricao} detalhe={l.detalhe} valor={l.valor} />
                    ))}
                    {data.encargosLinhas.length === 0 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground italic">Sem encargos</div>
                    )}
                  </div>
                  <div className="px-4 py-2 bg-muted/40 border-t flex items-center justify-between">
                    <span className="text-sm font-medium">Total de Encargos</span>
                    <span className="font-bold tabular-nums text-amber-600">{formatBRL(data.totalEncargos)}</span>
                  </div>
                </section>

                <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1.5"><Calculator className="h-3.5 w-3.5" />Salário Bruto (Líquido + Encargos)</span>
                  <span className="font-bold tabular-nums">{formatBRL(data.bruto)}</span>
                </div>

                {data.descontosLinhas.length > 0 && (
                  <section className="rounded-lg border">
                    <div className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 border-b flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-rose-600" />
                      <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">Descontos</span>
                    </div>
                    <div className="divide-y">
                      {data.descontosLinhas.map((l, i) => (
                        <LinhaRow key={i} descricao={l.descricao} detalhe={l.detalhe} valor={l.valor} negativo />
                      ))}
                    </div>
                    <div className="px-4 py-2 bg-muted/40 border-t flex items-center justify-between">
                      <span className="text-sm font-medium">Total de Descontos</span>
                      <span className="font-bold tabular-nums text-rose-600">- {formatBRL(data.totalDescontos)}</span>
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Líquido final */}
            <div className="rounded-lg border-2 border-primary bg-primary/5 px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor Líquido a Receber</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isPadrao02
                    ? 'Líquido base − descontos de faltas'
                    : 'Bruto − Total de Descontos'}
                </p>
              </div>
              <span className="text-2xl font-bold text-primary tabular-nums">{formatBRL(data.liquido)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const LinhaRow = ({ descricao, detalhe, valor, negativo }: { descricao: string; detalhe?: string; valor: number; negativo?: boolean }) => (
  <div className="px-4 py-2 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-sm truncate">{descricao}</p>
      {detalhe && <p className="text-[11px] text-muted-foreground">{detalhe}</p>}
    </div>
    <span className={`text-sm font-medium tabular-nums shrink-0 ${negativo ? 'text-rose-600' : ''}`}>
      {negativo ? '- ' : ''}{formatBRL(valor)}
    </span>
  </div>
);

export default ContrachequeDetalhado;
