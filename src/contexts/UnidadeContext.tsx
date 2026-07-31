import { createContext, useContext, useState, ReactNode } from 'react';
import { safeSession } from '@/lib/safeStorage';

interface UnidadeContextType {
  unidadeId: string | null;
  unidadeNome: string | null;
  unidadePadrao: string | null;
  setUnidade: (id: string, nome: string, padrao?: string) => void;
  clearUnidade: () => void;
}

const UnidadeContext = createContext<UnidadeContextType | undefined>(undefined);

export function UnidadeProvider({ children }: { children: ReactNode }) {
  const [unidadeId, setUnidadeId] = useState<string | null>(() => safeSession.get('unidade_id'));
  const [unidadeNome, setUnidadeNome] = useState<string | null>(() => safeSession.get('unidade_nome'));
  const [unidadePadrao, setUnidadePadrao] = useState<string | null>(() => safeSession.get('unidade_padrao'));

  const setUnidade = (id: string, nome: string, padrao?: string) => {
    safeSession.set('unidade_id', id);
    safeSession.set('unidade_nome', nome);
    safeSession.set('unidade_padrao', padrao || 'padrao_01');
    setUnidadeId(id);
    setUnidadeNome(nome);
    setUnidadePadrao(padrao || 'padrao_01');
  };

  const clearUnidade = () => {
    safeSession.remove('unidade_id');
    safeSession.remove('unidade_nome');
    safeSession.remove('unidade_padrao');
    setUnidadeId(null);
    setUnidadeNome(null);
    setUnidadePadrao(null);
  };


  return (
    <UnidadeContext.Provider value={{ unidadeId, unidadeNome, unidadePadrao, setUnidade, clearUnidade }}>
      {children}
    </UnidadeContext.Provider>
  );
}

export function useUnidade() {
  const context = useContext(UnidadeContext);
  if (!context) throw new Error('useUnidade must be used within UnidadeProvider');
  return context;
}
