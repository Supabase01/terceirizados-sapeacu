import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Clock, FileWarning, ClipboardCheck, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnidade } from '@/contexts/UnidadeContext';

type Status = 'entregue' | 'pendente' | 'justificado';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const today = new Date();
const ANOS = Array.from({ length: 6 }, (_, i) => today.getFullYear() - 2 + i);

const statusBadge = (s: Status) => {
  if (s === 'entregue') return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30">Entregue</Badge>;
  if (s === 'justificado') return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-500/30">Justificado</Badge>;
  return <Badge variant="destructive" className="bg-destructive/15 text-destructive hover:bg-destructive/20 border-destructive/30">Pendente</Badge>;
};

const Frequencia = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unidadeId } = useUnidade();

  const [mes, setMes] = useState<number>(today.getMonth() + 1);
  const [ano, setAno] = useState<number>(today.getFullYear());
  const [search, setSearch] = useState('');
  const [secretariaFilter, setSecretariaFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | Status>('todos');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Local edit buffer for inline faltas inputs (avoid jitter while typing)
  const [faltasDraft, setFaltasDraft] = useState<Record<string, string>>({});

  const [obsDialog, setObsDialog] = useState<{ open: boolean; colaboradorId: string | null; observacao: string; faltas: string }>({
    open: false, colaboradorId: null, observacao: '', faltas: '0',
  });

  const { data: secretarias = [] } = useQuery({
    queryKey: ['secretarias', unidadeId],
    queryFn: async () => {
      const { data, error } = await supabase.from('secretarias').select('id,nome').eq('unidade_id', unidadeId!).eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const { data: colaboradores = [], isLoading: loadingCol } = useQuery({
    queryKey: ['colaboradores-frequencia', unidadeId],
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('id,nome,cpf,matricula,secretaria_id,ativo')
          .eq('unidade_id', unidadeId!)
          .eq('ativo', true)
          .order('nome')
          .range(from, from + step - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < step) break;
        from += step;
      }
      return all;
    },
    enabled: !!unidadeId,
  });

  const { data: frequencias = [] } = useQuery({
    queryKey: ['frequencias', unidadeId, mes, ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frequencias')
        .select('*')
        .eq('unidade_id', unidadeId!)
        .eq('mes', mes)
        .eq('ano', ano);
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const freqMap = useMemo(() => {
    const m = new Map<string, any>();
    frequencias.forEach((f: any) => m.set(f.colaborador_id, f));
    return m;
  }, [frequencias]);

  const secretariasMap = useMemo(() => {
    const m = new Map<string, string>();
    secretarias.forEach((s: any) => m.set(s.id, s.nome));
    return m;
  }, [secretarias]);

  const rows = useMemo(() => {
    return colaboradores
      .map((c: any) => {
        const f = freqMap.get(c.id);
        const status: Status = f?.status ?? 'pendente';
        return { ...c, status, frequencia: f, faltas: f?.faltas ?? 0, secretariaNome: secretariasMap.get(c.secretaria_id) ?? '—' };
      })
      .filter((r: any) => {
        if (secretariaFilter !== 'todas' && r.secretaria_id !== secretariaFilter) return false;
        if (statusFilter !== 'todos' && r.status !== statusFilter) return false;
        if (search) {
          const t = search.toLowerCase();
          if (!r.nome.toLowerCase().includes(t) && !(r.cpf ?? '').includes(t) && !(r.matricula ?? '').includes(t)) return false;
        }
        return true;
      });
  }, [colaboradores, freqMap, secretariasMap, secretariaFilter, statusFilter, search]);

  const totals = useMemo(() => {
    const t = { total: colaboradores.length, entregue: 0, pendente: 0, justificado: 0, faltas: 0 };
    colaboradores.forEach((c: any) => {
      const f = freqMap.get(c.id);
      const s: Status = f?.status ?? 'pendente';
      t[s]++;
      t.faltas += Number(f?.faltas ?? 0);
    });
    return t;
  }, [colaboradores, freqMap]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: { colaboradorIds: string[]; status?: Status; observacao?: string | null; faltas?: number; resetFaltas?: boolean }) => {
      // Need existing rows to preserve fields not being changed
      const rowsToUpsert = payload.colaboradorIds.map((cid) => {
        const existing = freqMap.get(cid);
        const status: Status = payload.status ?? (existing?.status as Status) ?? 'pendente';
        const faltas = payload.resetFaltas
          ? 0
          : payload.faltas !== undefined
            ? payload.faltas
            : Number(existing?.faltas ?? 0);
        return {
          colaborador_id: cid,
          unidade_id: unidadeId!,
          mes,
          ano,
          status,
          faltas,
          data_entrega: status === 'entregue' ? (existing?.data_entrega ?? new Date().toISOString().slice(0, 10)) : null,
          observacao: payload.observacao !== undefined ? payload.observacao : (existing?.observacao ?? null),
        };
      });
      const { error } = await supabase.from('frequencias').upsert(rowsToUpsert, { onConflict: 'colaborador_id,mes,ano' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frequencias', unidadeId, mes, ano] });
      toast({ title: 'Frequência atualizada' });
    },
    onError: (e: any) => toast({ title: 'Erro ao atualizar', description: e?.message ?? 'Tente novamente.', variant: 'destructive' }),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = rows.length > 0 && rows.every((r: any) => selected.has(r.id));
  const toggleSelectAll = () => {
    if (allFilteredSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r: any) => r.id)));
  };

  const handleBulk = (status: Status) => {
    if (selected.size === 0) {
      toast({ title: 'Selecione ao menos um colaborador', variant: 'destructive' });
      return;
    }
    // Lote sempre zera faltas (regra de negócio)
    upsertMutation.mutate(
      { colaboradorIds: Array.from(selected), status, resetFaltas: status === 'entregue' },
      { onSuccess: () => setSelected(new Set()) },
    );
  };

  const saveFaltasInline = (colaboradorId: string, raw: string) => {
    let n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > 31) n = 31;
    const existing = freqMap.get(colaboradorId);
    const current = Number(existing?.faltas ?? 0);
    if (n === current) return; // nada mudou
    upsertMutation.mutate({ colaboradorIds: [colaboradorId], faltas: n });
    setFaltasDraft((d) => ({ ...d, [colaboradorId]: '' }));
  };

  const openObs = (colaboradorId: string, current?: { observacao?: string | null; faltas?: number | null }) => {
    setObsDialog({
      open: true,
      colaboradorId,
      observacao: current?.observacao ?? '',
      faltas: String(current?.faltas ?? 0),
    });
  };

  const saveObs = () => {
    if (!obsDialog.colaboradorId) return;
    let n = parseInt(obsDialog.faltas, 10);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n > 31) n = 31;
    upsertMutation.mutate({
      colaboradorIds: [obsDialog.colaboradorId],
      observacao: obsDialog.observacao.trim() || null,
      faltas: n,
    });
    setObsDialog({ open: false, colaboradorId: null, observacao: '', faltas: '0' });
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Controle de Frequência</h1>
            <p className="text-sm text-muted-foreground">Marque a entrega da folha de frequência e registre faltas. Faltas geram desconto automático (Bruto ÷ 30 × Nº faltas).</p>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total de colaboradores</div>
            <div className="text-2xl font-bold">{totals.total}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Entregues</div>
            <div className="text-2xl font-bold text-emerald-600">{totals.entregue}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-destructive" /> Pendentes</div>
            <div className="text-2xl font-bold text-destructive">{totals.pendente}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><FileWarning className="h-3.5 w-3.5 text-amber-600" /> Justificados</div>
            <div className="text-2xl font-bold text-amber-600">{totals.justificado}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 text-orange-600" /> Total de faltas</div>
            <div className="text-2xl font-bold text-orange-600">{totals.faltas}</div>
          </CardContent></Card>
        </div>

        {/* Filtros */}
        <Card><CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Mês</label>
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Ano</label>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Secretaria</label>
            <Select value={secretariaFilter} onValueChange={setSecretariaFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {secretarias.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="justificado">Justificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Buscar por nome, CPF ou matrícula..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[220px]" />
        </CardContent></Card>

        {/* Ações em lote */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{selected.size} selecionado(s)</span>
          <Button size="sm" variant="default" onClick={() => handleBulk('entregue')} disabled={selected.size === 0 || upsertMutation.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar entregue (faltas = 0)
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulk('justificado')} disabled={selected.size === 0 || upsertMutation.isPending}>
            <FileWarning className="h-4 w-4 mr-1" /> Justificado
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleBulk('pendente')} disabled={selected.size === 0 || upsertMutation.isPending}>
            <Clock className="h-4 w-4 mr-1" /> Voltar para pendente
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAll} aria-label="Selecionar todos" />
                  </TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="w-28">Matrícula</TableHead>
                  <TableHead>Secretaria</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-24">Faltas</TableHead>
                  <TableHead className="w-32">Data entrega</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCol ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum colaborador encontrado</TableCell></TableRow>
                ) : rows.map((r: any) => {
                  const draft = faltasDraft[r.id];
                  const value = draft !== undefined ? draft : String(r.faltas ?? 0);
                  const disabled = r.status === 'pendente';
                  return (
                    <TableRow key={r.id} className={selected.has(r.id) ? 'bg-muted/40' : ''}>
                      <TableCell>
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{r.nome}</span>
                          {r.faltas > 0 && (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/30 text-[10px] py-0 h-5">
                              {r.faltas} {r.faltas === 1 ? 'falta' : 'faltas'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.matricula ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.secretariaNome}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={31}
                          value={value}
                          disabled={disabled}
                          onChange={(e) => setFaltasDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                          onBlur={(e) => saveFaltasInline(r.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className="h-8 w-16 text-sm"
                          title={disabled ? 'Marque a frequência como entregue ou justificada para registrar faltas' : 'Quantidade de faltas no mês'}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {r.frequencia?.data_entrega ? new Date(r.frequencia.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openObs(r.id, { observacao: r.frequencia?.observacao, faltas: r.faltas })}>
                          {r.frequencia?.observacao ? r.frequencia.observacao.slice(0, 40) + (r.frequencia.observacao.length > 40 ? '…' : '') : 'Adicionar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={obsDialog.open} onOpenChange={(o) => !o && setObsDialog({ open: false, colaboradorId: null, observacao: '', faltas: '0' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Frequência — observações e faltas</DialogTitle>
            <DialogDescription>Competência {String(mes).padStart(2, '0')}/{ano}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Quantidade de faltas</Label>
              <Input
                type="number"
                min={0}
                max={31}
                value={obsDialog.faltas}
                onChange={(e) => setObsDialog((s) => ({ ...s, faltas: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Será descontado automaticamente na folha: Bruto ÷ 30 × Nº faltas.</p>
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Textarea
                value={obsDialog.observacao}
                onChange={(e) => setObsDialog((s) => ({ ...s, observacao: e.target.value }))}
                placeholder="Ex.: Atestado médico apresentado em 05/04..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObsDialog({ open: false, colaboradorId: null, observacao: '', faltas: '0' })}>Cancelar</Button>
            <Button onClick={saveObs} disabled={upsertMutation.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Frequencia;
