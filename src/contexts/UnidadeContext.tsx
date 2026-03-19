import { createContext, useContext, useState, ReactNode } from 'react';

interface UnidadeContextType {
  unidadeId: string | null;
  unidadeNome: string | null;
  unidadePadrao: string | null;
  setUnidade: (id: string, nome: string, padrao?: string) => void;
  clearUnidade: () => void;
}

const UnidadeContext = createContext<UnidadeContextType | undefined>(undefined);

export function UnidadeProvider({ children }: { children: ReactNode }) {
  const [unidadeId, setUnidadeId] = useState<string | null>(() => sessionStorage.getItem('unidade_id'));
  const [unidadeNome, setUnidadeNome] = useState<string | null>(() => sessionStorage.getItem('unidade_nome'));
  const [unidadePadrao, setUnidadePadrao] = useState<string | null>(() => sessionStorage.getItem('unidade_padrao'));

  const setUnidade = (id: string, nome: string, padrao?: string) => {
    sessionStorage.setItem('unidade_id', id);
    sessionStorage.setItem('unidade_nome', nome);
    sessionStorage.setItem('unidade_padrao', padrao || 'padrao_01');
    setUnidadeId(id);
    setUnidadeNome(nome);
    setUnidadePadrao(padrao || 'padrao_01');
  };

  const clearUnidade = () => {
    sessionStorage.removeItem('unidade_id');
    sessionStorage.removeItem('unidade_nome');
    sessionStorage.removeItem('unidade_padrao');
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
