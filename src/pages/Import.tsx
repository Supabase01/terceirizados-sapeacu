import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseFile } from '@/lib/parseFile';
import { useQueryClient } from '@tanstack/react-query';
import { useUnidade } from '@/contexts/UnidadeContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

const BATCH_SIZE = 500;

const handleDownloadTemplate = () => {
  const headers = [['PREFEITURA', 'PASTA', 'ANO', 'MÊS', 'NOME', 'FUNÇÃO', 'CPF', 'BRUTO', 'LÍQUIDO']];
  const ws = XLSX.utils.aoa_to_sheet(headers);
  ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 8 }, { wch: 6 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
  XLSX.writeFile(wb, 'modelo_importacao.xlsx');
};

const Import = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const queryClient = useQueryClient();
  const { unidadeId } = useUnidade();
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.csv'))) {
      setFile(f);
      setResult(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file || !unidadeId) return;
    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const parsed = await parseFile(file);
      if (!parsed.success) {
        setResult({ success: false, message: parsed.errors.join('\n') });
        setImporting(false);
        return;
      }

      // Fetch colaboradores for this unidade to match CPFs
      const { data: colaboradores, error: colabError } = await supabase
        .from('colaboradores')
        .select('id, cpf, nome, funcao_id, secretaria_id, lotacao_id, salario_base')
        .eq('unidade_id', unidadeId)
        .eq('ativo', true);

      if (colabError) throw colabError;

      // Also fetch funcao and secretaria names for display
      const { data: funcoes } = await supabase
        .from('funcoes')
        .select('id, nome')
        .eq('unidade_id', unidadeId);

      const { data: secretarias } = await supabase
        .from('secretarias')
        .select('id, nome')
        .eq('unidade_id', unidadeId);

      const { data: lotacoes } = await supabase
        .from('lotacoes')
        .select('id, nome')
        .eq('unidade_id', unidadeId);

      const funcaoMap = new Map((funcoes || []).map(f => [f.id, f.nome]));
      const secretariaMap = new Map((secretarias || []).map(s => [s.id, s.nome]));
      const lotacaoMap = new Map((lotacoes || []).map(l => [l.id, l.nome]));

      // Build CPF → colaborador map
      const cpfMap = new Map(
        (colaboradores || []).map(c => [c.cpf.replace(/\D/g, ''), c])
      );

      // Determine unique periods from import data
      const periods = new Set(parsed.data.map(r => `${r.ano}-${r.mes}`));

      // Delete existing drafts for these periods
      for (const period of periods) {
        const [pAno, pMes] = period.split('-').map(Number);
        await supabase
          .from('folha_processamento')
          .delete()
          .eq('unidade_id', unidadeId)
          .eq('mes', pMes)
          .eq('ano', pAno)
          .eq('status', 'rascunho');
      }

      // Map parsed records to folha_processamento rows
      const notFound: string[] = [];
      const folhaRows: any[] = [];

      for (const row of parsed.data) {
        const cpfClean = String(row.cpf).replace(/\D/g, '');
        const colab = cpfMap.get(cpfClean);

        if (!colab) {
          notFound.push(`${row.nome} (CPF: ${cpfClean})`);
          continue;
        }

        const salarioBase = Number(colab.salario_base) || 0;
        const bruto = Number(row.bruto) || 0;
        const liquido = Number(row.liquido) || 0;
        const totalAdicionais = bruto > salarioBase ? bruto - salarioBase : 0;
        const totalDescontos = bruto - liquido;

        folhaRows.push({
          colaborador_id: colab.id,
          nome: colab.nome,
          cpf: cpfClean,
          funcao: colab.funcao_id ? funcaoMap.get(colab.funcao_id) || row.funcao || '' : row.funcao || '',
          secretaria: colab.secretaria_id ? secretariaMap.get(colab.secretaria_id) || row.pasta || '' : row.pasta || '',
          lotacao: colab.lotacao_id ? lotacaoMap.get(colab.lotacao_id) || '' : '',
          salario_base: salarioBase,
          total_adicionais: totalAdicionais,
          total_descontos: totalDescontos,
          bruto,
          liquido,
          mes: row.mes,
          ano: row.ano,
          unidade_id: unidadeId,
          status: 'rascunho',
        });
      }

      // Insert in batches
      let inserted = 0;
      const total = folhaRows.length;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = folhaRows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('folha_processamento').insert(batch);
        if (error) throw error;
        inserted += batch.length;
        setProgress(Math.round((inserted / total) * 100));
      }

      queryClient.invalidateQueries({ queryKey: ['folha-processamento'] });

      let message = `${inserted} registros importados como rascunho!`;
      if (notFound.length > 0) {
        message += `\n\n${notFound.length} colaborador(es) não encontrado(s) na unidade:\n${notFound.slice(0, 10).join('\n')}`;
        if (notFound.length > 10) message += `\n... e mais ${notFound.length - 10}`;
      }

      setResult({ success: true, message });
      toast({ title: 'Importação concluída', description: `${inserted} registros como rascunho.` });
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Erro durante a importação.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importar Dados</h1>
          <p className="text-muted-foreground">
            Faça upload de arquivos Excel (.xlsx) ou CSV com os dados da folha de pagamento.
            Os dados serão importados como <strong>rascunho</strong> na Folha em Processamento.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload de Arquivo</CardTitle>
            <CardDescription>
              Colunas obrigatórias: PREFEITURA, PASTA, ANO, MÊS, NOME, FUNÇÃO, CPF, BRUTO, LÍQUIDO.
              Os CPFs serão vinculados aos colaboradores cadastrados na unidade atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="mb-3 h-10 w-10 text-primary" />
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium text-foreground">Arraste o arquivo aqui</p>
                  <p className="text-sm text-muted-foreground">ou clique para selecionar (.xlsx ou .csv)</p>
                </>
              )}
              <input id="file-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
            </div>

            {importing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-muted-foreground text-center">{progress}% concluído</p>
              </div>
            )}

            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{result.success ? 'Sucesso' : 'Erro'}</AlertTitle>
                <AlertDescription className="whitespace-pre-line">{result.message}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleImport} disabled={!file || importing || !unidadeId} className="w-full h-12">
              <Upload className="mr-2 h-4 w-4" />
              {importing ? 'Importando...' : 'Importar como Rascunho'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Import;
