import { supabase } from '@/integrations/supabase/client';

export type LogTipo = 'info' | 'sucesso' | 'aviso' | 'erro';
export type LogCategoria = 'autenticacao' | 'importacao' | 'folha' | 'cadastro' | 'sistema' | 'permissao';

interface LogParams {
  tipo?: LogTipo;
  categoria: LogCategoria;
  descricao: string;
  detalhes?: Record<string, any>;
  unidadeId?: string | null;
}

export async function registrarLog({ tipo = 'info', categoria, descricao, detalhes, unidadeId }: LogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await (supabase as any).from('logs_sistema').insert({
      tipo,
      categoria,
      descricao,
      detalhes: detalhes || null,
      user_id: user?.id || null,
      user_email: user?.email || null,
      unidade_id: unidadeId || null,
    });
  } catch (e) {
    console.error('Erro ao registrar log do sistema:', e);
  }
}
