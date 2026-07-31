// Acesso seguro ao sessionStorage: em navegadores/iframes com armazenamento
// bloqueado, o acesso direto lança exceção e derruba a renderização (tela branca).
const memory = new Map<string, string>();

export const safeSession = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string) {
    memory.set(key, value);
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // ignora: mantém apenas em memória
    }
  },
  remove(key: string) {
    memory.delete(key);
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignora
    }
  },
};
