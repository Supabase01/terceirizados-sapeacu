import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseColaboradoresFile, COLABORADOR_TEMPLATE_HEADERS } from '@/lib/parseColaboradoresFile';
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
  const ws = XLSX.utils.aoa_to_sheet([COLABORADOR_TEMPLATE_HEADERS]);
  ws['!cols'] = COLABORADOR_TEMPLATE_HEADERS.map(h => ({ wch: Math.max(h.length + 4, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
  XLSX.writeFile(wb, 'modelo_importacao_colaboradores.xlsx');
};

const ImportColaboradores = () => {
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
    if (f) { setFile(f); setResult(null); }
  };

  const handleImport = async () => {
    if (!file || !unidadeId) return;
    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const parsed = await parseColaboradoresFile(file);
      if (!parsed.success) {
        setResult({ success: false, message: parsed.errors.join('\n') });
        setImporting(false);
        return;
      }

      // Load lookup tables to resolve names → IDs
      const [
        { data: secretarias },
        { data: funcoes },
        { data: lotacoes },
        { data: liderancas },
        { data: cidades },
        { data: existingColabs },
      ] = await Promise.all([
        supabase.from('secretarias').select('id, nome').eq('unidade_id', unidadeId).eq('ativo', true),
        supabase.from('funcoes').select('id, nome').eq('unidade_id', unidadeId).eq('ativo', true),
        supabase.from('lotacoes').select('id, nome').eq('unidade_id', unidadeId).eq('ativo', true),
        supabase.from('liderancas').select('id, nome').eq('unidade_id', unidadeId).eq('ativo', true),
        supabase.from('cidades').select('id, nome').eq('ativo', true),
        supabase.from('colaboradores').select('cpf').eq('unidade_id', unidadeId),
      ]);

      const normalize = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const makeMap = (items: { id: string; nome: string }[] | null) =>
        new Map((items || []).map(i => [normalize(i.nome), i.id]));

      const secMap = makeMap(secretarias);
      const funcMap = makeMap(funcoes);
      const lotMap = makeMap(lotacoes);
      const lidMap = makeMap(liderancas);
      const cidMap = makeMap(cidades);
      const existingCpfs = new Set((existingColabs || []).map(c => c.cpf.replace(/\D/g, '')));

      const duplicates: string[] = [];
      const notFoundRefs: string[] = [];
      const rows: any[] = [];

      for (const rec of parsed.data) {
        if (existingCpfs.has(rec.cpf)) {
          duplicates.push(`${rec.nome} (CPF: ${rec.cpf})`);
          continue;
        }

        const secretaria_id = rec.secretaria ? secMap.get(normalize(rec.secretaria)) || null : null;
        const funcao_id = rec.funcao ? funcMap.get(normalize(rec.funcao)) || null : null;
        const lotacao_id = rec.lotacao ? lotMap.get(normalize(rec.lotacao)) || null : null;
        const lideranca_id = rec.lideranca ? lidMap.get(normalize(rec.lideranca)) || null : null;
        const cidade_id = rec.cidade ? cidMap.get(normalize(rec.cidade)) || null : null;

        const warnings: string[] = [];
        if (rec.secretaria && !secretaria_id) warnings.push(`Secretaria "${rec.secretaria}"`);
        if (rec.funcao && !funcao_id) warnings.push(`Função "${rec.funcao}"`);
        if (rec.lotacao && !lotacao_id) warnings.push(`Lotação "${rec.lotacao}"`);
        if (rec.lideranca && !lideranca_id) warnings.push(`Liderança "${rec.lideranca}"`);
        if (rec.cidade && !cidade_id) warnings.push(`Cidade "${rec.cidade}"`);
        if (warnings.length > 0) notFoundRefs.push(`${rec.nome}: ${warnings.join(', ')}`);

        // Parse date
        let data_admissao: string | null = null;
        if (rec.data_admissao) {
          const d = rec.data_admissao;
          // Try DD/MM/YYYY
          const parts = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (parts) {
            data_admissao = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            data_admissao = d;
          }
        }

        rows.push({
          nome: rec.nome,
          cpf: rec.cpf,
          matricula: rec.matricula || null,
          secretaria_id,
          funcao_id,
          lotacao_id,
          lideranca_id,
          cidade_id,
          salario_base: rec.salario_base,
          data_admissao,
          beneficio_social: rec.beneficio_social,
          banco: rec.banco || null,
          conta: rec.conta || null,
          pix: rec.pix || null,
          endereco: rec.endereco || null,
          numero: rec.numero || null,
          complemento: rec.complemento || null,
          bairro: rec.bairro || null,
          cep: rec.cep || null,
          unidade_id: unidadeId,
          ativo: true,
        });

        existingCpfs.add(rec.cpf);
      }

      let inserted = 0;
      const total = rows.length;
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('colaboradores').insert(batch);
        if (error) throw error;
        inserted += batch.length;
        setProgress(Math.round((inserted / total) * 100));
      }

      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });

      let message = `${inserted} colaborador(es) importado(s) com sucesso!`;
      if (duplicates.length > 0) {
        message += `\n\n${duplicates.length} CPF(s) já existente(s) na unidade (ignorados):\n${duplicates.slice(0, 10).join('\n')}`;
        if (duplicates.length > 10) message += `\n... e mais ${duplicates.length - 10}`;
      }
      if (notFoundRefs.length > 0) {
        message += `\n\n${notFoundRefs.length} referência(s) não encontrada(s) (campos ficaram vazios):\n${notFoundRefs.slice(0, 10).join('\n')}`;
        if (notFoundRefs.length > 10) message += `\n... e mais ${notFoundRefs.length - 10}`;
      }

      setResult({ success: true, message });
      toast({ title: 'Importação concluída', description: `${inserted} colaboradores importados.` });
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
          <h1 className="text-2xl font-bold text-foreground">Importar Colaboradores</h1>
          <p className="text-muted-foreground">
            Faça upload de arquivos Excel (.xlsx) ou CSV com os dados dos colaboradores.
            Colaboradores com CPF já existente na unidade serão ignorados.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload de Arquivo</CardTitle>
            <CardDescription>
              Colunas obrigatórias: NOME, CPF. Demais colunas são opcionais: MATRÍCULA, SECRETARIA, FUNÇÃO, LOTAÇÃO, LIDERANÇA, SALÁRIO BASE, DATA ADMISSÃO, BENEFÍCIO SOCIAL, BANCO, CONTA, PIX, ENDEREÇO, NÚMERO, COMPLEMENTO, BAIRRO, CIDADE, CEP.
            </CardDescription>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="mt-2 w-fit">
              <Download className="mr-2 h-4 w-4" />
              Baixar modelo de planilha
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
              onClick={() => document.getElementById('colab-file-input')?.click()}
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
              <input id="colab-file-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
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
              {importing ? 'Importando...' : 'Importar Colaboradores'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ImportColaboradores;
