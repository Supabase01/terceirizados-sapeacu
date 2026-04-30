import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ArrowDown, ArrowUp, Calculator, Wallet, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { fetchUnidadeInfo, fetchContrachequeCalculo, downloadSingleContracheque } from '@/lib/contrachequePdf';

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

  const { data: unidadeInfo } = useQuery({
    queryKey: ['contracheque-unidade-info', unidadeId],
    queryFn: () => fetchUnidadeInfo(unidadeId),
    enabled,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['contracheque-detalhe', registro?.id, registro?.colaborador_id, registro?.mes, registro?.ano, unidadeId],
    queryFn: () => fetchContrachequeCalculo(registro, unidadeId, isPadrao02),
    enabled,
  });

  if (!registro) return null;

  const handleDownloadPDF = () => {
    if (!data) return;
    downloadSingleContracheque(registro, data, unidadeInfo || null, isPadrao02);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-8">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Contracheque Detalhado
            </span>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={!data}>
              <Download className="h-4 w-4 mr-1" /> Baixar PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Unidade / Instituição */}
        {unidadeInfo && (
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="font-semibold text-sm leading-tight">
              {unidadeInfo.instituicao?.nome || unidadeInfo.nome}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              {unidadeInfo.instituicao?.cnpj && <span>CNPJ: {unidadeInfo.instituicao.cnpj}</span>}
              {(unidadeInfo.instituicao?.cidade || unidadeInfo.cidade) && (
                <span>
                  {unidadeInfo.instituicao?.cidade || unidadeInfo.cidade}
                  {(unidadeInfo.instituicao?.estado || unidadeInfo.estado) && ` - ${unidadeInfo.instituicao?.estado || unidadeInfo.estado}`}
                </span>
              )}
              {unidadeInfo.instituicao?.telefone && <span>Tel: {unidadeInfo.instituicao.telefone}</span>}
              {unidadeInfo.instituicao?.email && <span>{unidadeInfo.instituicao.email}</span>}
              {unidadeInfo.instituicao?.nome && unidadeInfo.nome && unidadeInfo.nome !== unidadeInfo.instituicao.nome && (
                <span>Unidade: {unidadeInfo.nome}</span>
              )}
            </div>
          </div>
        )}

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
          <div className="space-y-5">
            {/* Padrão 01 */}
            {!isPadrao02 && (
              <>
                <section>
                  <div className="flex items-center gap-2 pb-1.5 border-b">
                    <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Proventos</span>
                  </div>
                  <div className="divide-y divide-border/60">
                    <LinhaRow descricao="Salário Base" valor={data.salarioBase} />
                    {data.adicionaisLinhas.map((l, i) => (
                      <LinhaRow key={i} descricao={l.descricao} detalhe={l.detalhe} valor={l.valor} />
                    ))}
                    {data.adicionaisLinhas.length === 0 && (
                      <div className="px-1 py-2 text-xs text-muted-foreground italic">Sem adicionais</div>
                    )}
                  </div>
                  <div className="border-t-2 border-foreground/30 px-1 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-1.5"><Calculator className="h-3.5 w-3.5" />Salário Bruto</span>
                    <span className="font-semibold tabular-nums">{formatBRL(data.bruto)}</span>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 pb-1.5 border-b">
                    <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descontos</span>
                  </div>
                  <div className="divide-y divide-border/60">
                    {data.descontosLinhas.map((l, i) => (
                      <LinhaRow key={i} descricao={l.descricao} detalhe={l.detalhe} valor={l.valor} negativo />
                    ))}
                    {data.descontosLinhas.length === 0 && (
                      <div className="px-1 py-2 text-xs text-muted-foreground italic">Sem descontos</div>
                    )}
                  </div>
                  <div className="border-t-2 border-foreground/30 px-1 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">Total de Descontos</span>
                    <span className="font-semibold tabular-nums">- {formatBRL(data.totalDescontos)}</span>
                  </div>
                </section>
              </>
            )}

            {/* Padrão 02 */}
            {isPadrao02 && (
              <>
                <section>
                  <div className="flex items-center gap-2 pb-1.5 border-b">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Líquido Contratado</span>
                  </div>
                  <div className="divide-y divide-border/60">
                    <LinhaRow descricao="Salário Líquido (base)" valor={data.salarioBase} />
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 pb-1.5 border-b">
                    <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Encargos sobre o Líquido</span>
                  </div>
                  <div className="divide-y divide-border/60">
                    {data.encargosLinhas.map((l, i) => (
                      <LinhaRow key={i} descricao={l.descricao} detalhe={l.detalhe} valor={l.valor} />
                    ))}
                    {data.encargosLinhas.length === 0 && (
                      <div className="px-1 py-2 text-xs text-muted-foreground italic">Sem encargos</div>
                    )}
                  </div>
                  <div className="border-t-2 border-foreground/30 px-1 py-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">Total de Encargos</span>
                    <span className="font-semibold tabular-nums">{formatBRL(data.totalEncargos)}</span>
                  </div>
                </section>

                <div className="border-y px-1 py-2 flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-1.5"><Calculator className="h-3.5 w-3.5" />Salário Bruto (Líquido + Encargos)</span>
                  <span className="font-semibold tabular-nums">{formatBRL(data.bruto)}</span>
                </div>

                {data.descontosLinhas.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 pb-1.5 border-b">
                      <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descontos</span>
                    </div>
                    <div className="divide-y divide-border/60">
                      {data.descontosLinhas.map((l, i) => (
                        <LinhaRow key={i} descricao={l.descricao} detalhe={l.detalhe} valor={l.valor} negativo />
                      ))}
                    </div>
                    <div className="border-t-2 border-foreground/30 px-1 py-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">Total de Descontos</span>
                      <span className="font-semibold tabular-nums">- {formatBRL(data.totalDescontos)}</span>
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Líquido final - apenas linhas destacadas */}
            <div className="border-y-2 border-foreground/40 px-1 py-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Valor Líquido a Receber</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isPadrao02 ? 'Líquido base − descontos de faltas' : 'Bruto − Total de Descontos'}
                </p>
              </div>
              <span className="text-2xl font-bold tabular-nums">{formatBRL(data.liquido)}</span>
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
    <span className={`text-sm font-medium tabular-nums shrink-0 ${negativo ? 'text-foreground' : ''}`}>
      {negativo ? '- ' : ''}{formatBRL(valor)}
    </span>
  </div>
);

export default ContrachequeDetalhado;
