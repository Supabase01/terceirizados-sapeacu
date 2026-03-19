import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnidade } from '@/contexts/UnidadeContext';
import { useIsMaster } from '@/hooks/useIsMaster';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, LogOut } from 'lucide-react';

export default function SelecionarUnidade() {
  const navigate = useNavigate();
  const { setUnidade } = useUnidade();
  const { isMaster } = useIsMaster();
  const { isAdmin } = useIsAdmin();

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades-selecao', isMaster, isAdmin],
    queryFn: async () => {
      if (isMaster || isAdmin) {
        const { data, error } = await supabase
          .from('unidades_folha')
          .select('*')
          .eq('ativo', true)
          .order('nome');
        if (error) throw error;
        return data || [];
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('usuario_unidades')
        .select('unidade_id, unidades_folha(id, nome, cidade, estado, instituicao_tipo, padrao)')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || [])
        .map((d: any) => d.unidades_folha)
        .filter(Boolean);
    },
  });

  const handleSelect = (unidade: any) => {
    setUnidade(unidade.id, unidade.nome, unidade.padrao || 'padrao_01');
    navigate('/indicadores');
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('pin_validated');
    sessionStorage.removeItem('unidade_id');
    sessionStorage.removeItem('unidade_nome');
    sessionStorage.removeItem('unidade_padrao');
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-lg border-border/50">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Selecionar Unidade</CardTitle>
          <CardDescription>Escolha a unidade de folha para operar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando unidades...</p>
          ) : unidades.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-foreground">Nenhuma unidade vinculada ao seu usuário.</p>
              <p className="text-sm text-muted-foreground">Solicite ao administrador a vinculação.</p>
            </div>
          ) : (
            unidades.map((u: any) => (
              <Button
                key={u.id}
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-start gap-1 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => handleSelect(u)}
              >
                <span className="font-semibold text-foreground">{u.nome}</span>
                {(u.cidade || u.estado) && (
                  <span className="text-xs text-muted-foreground">
                    {[u.cidade, u.estado].filter(Boolean).join(' - ')}
                  </span>
                )}
              </Button>
            ))
          )}
          <Button variant="ghost" className="w-full mt-4 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
