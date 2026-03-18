import { createContext, useContext, useState, ReactNode } from 'react';

interface UnidadeContextType {
  unidadeId: string | null;
  unidadeNome: string | null;
  setUnidade: (id: string, nome: string) => void;
  clearUnidade: () => void;
}

const UnidadeContext = createContext<UnidadeContextType | undefined>(undefined);

export function UnidadeProvider({ children }: { children: ReactNode }) {
  const [unidadeId, setUnidadeId] = useState<string | null>(() => sessionStorage.getItem('unidade_id'));
  const [unidadeNome, setUnidadeNome] = useState<string | null>(() => sessionStorage.getItem('unidade_nome'));

  const setUnidade = (id: string, nome: string) => {
    sessionStorage.setItem('unidade_id', id);
    sessionStorage.setItem('unidade_nome', nome);
    setUnidadeId(id);
    setUnidadeNome(nome);
  };

  const clearUnidade = () => {
    sessionStorage.removeItem('unidade_id');
    sessionStorage.removeItem('unidade_nome');
    setUnidadeId(null);
    setUnidadeNome(null);
  };

  return (
    <UnidadeContext.Provider value={{ unidadeId, unidadeNome, setUnidade, clearUnidade }}>
      {children}
    </UnidadeContext.Provider>
  );
}

export function useUnidade() {
  const context = useContext(UnidadeContext);
  if (!context) throw new Error('useUnidade must be used within UnidadeProvider');
  return context;
}
