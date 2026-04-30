import Layout from '@/components/Layout';
import { ModuleCard } from '@/components/ModuleCard';
import { modules } from '@/config/modules';
import { useAllowedRoutes } from '@/hooks/useUserRoles';
import { useUnidade } from '@/contexts/UnidadeContext';

export default function Hub() {
  const { data: allowedRoutes } = useAllowedRoutes();
  const { unidadeNome, unidadePadrao } = useUnidade();
  const allowedSet = new Set(allowedRoutes?.map(r => r.route_path) || []);

  const visibleModules = modules
    .map(mod => ({
      ...mod,
      items: mod.items.filter(item => {
        if (!allowedSet.has(item.url)) return false;
        if (item.padrao && item.padrao !== unidadePadrao) return false;
        return true;
      }),
    }))
    .filter(mod => mod.items.length > 0);

  return (
    <Layout hideSidebar>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Módulos</h1>
          <p className="text-muted-foreground mt-1">
            {unidadeNome ? `Unidade: ${unidadeNome}` : 'Selecione um módulo para começar'}
          </p>
        </div>

        {visibleModules.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhum módulo disponível. Solicite acesso ao administrador.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {visibleModules.map(mod => (
              <ModuleCard
                key={mod.id}
                label={mod.label}
                icon={mod.icon}
                itemsCount={mod.items.length}
                targetUrl={mod.items[0].url}
                color={mod.color}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
