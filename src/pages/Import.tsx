import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { parseFile } from '@/lib/parseFile';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BATCH_SIZE = 500;

const Import = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [clearing, setClearing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleClearDatabase = async () => {
    setClearing(true);
    try {
      const { error } = await supabase.from('payroll_records').delete().gte('id', 0);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast({ title: 'Banco limpo', description: 'Todos os registros foram apagados.' });
      setResult(null);
      setFile(null);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao limpar banco.', variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  };

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
    if (!file) return;
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

      const total = parsed.data.length;
      let inserted = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = parsed.data.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('payroll_records').insert(batch);
        if (error) throw error;
        inserted += batch.length;
        setProgress(Math.round((inserted / total) * 100));
      }

      setResult({ success: true, message: `${inserted} registros importados com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast({ title: 'Importação concluída', description: `${inserted} registros salvos.` });
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
          <p className="text-muted-foreground">Faça upload de arquivos Excel (.xlsx) ou CSV com os dados da folha de pagamento.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload de Arquivo</CardTitle>
            <CardDescription>
              Colunas obrigatórias: PREFEITURA, PASTA, ANO, MÊS, NOME, FUNÇÃO, CPF, BRUTO, LÍQUIDO
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
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleImport} disabled={!file || importing} className="w-full h-12">
              <Upload className="mr-2 h-4 w-4" />
              {importing ? 'Importando...' : 'Iniciar Importação'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gerenciar Dados</CardTitle>
            <CardDescription>Remova todos os registros para reimportar os dados.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12" disabled={clearing}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {clearing ? 'Limpando...' : 'Limpar Banco de Dados'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos os registros serão apagados permanentemente. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearDatabase}>Sim, limpar tudo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Import;
