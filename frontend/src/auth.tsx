import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usuariosApi } from './services/api';
import type { Usuario, UsuarioRole } from './types';

const storageKey = 'ecocampus-session';
export const pendingCollectorStorageKey = 'ecocampus-pending-collector';

type AuthContextValue = {
  user: Usuario | null;
  login: (email: string, senha: string) => Promise<void>;
  register: (data: { nome: string; email: string; matricula?: string; senha: string; tipo: 'usuario' }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): Usuario | null {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return null;
  try {
    const user = JSON.parse(saved) as Partial<Usuario>;
    const roles: UsuarioRole[] = ['admin', 'coletor', 'usuario'];
    if (
      typeof user.id === 'string'
      && typeof user.nome === 'string'
      && typeof user.email === 'string'
      && roles.includes(user.role as UsuarioRole)
      && user.ativo === true
    ) return user as Usuario;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
  localStorage.removeItem(storageKey);
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(readSession);

  async function login(email: string, senha: string) {
    const response = await usuariosApi.login(email, senha);
    localStorage.setItem(storageKey, JSON.stringify(response.data));
    setUser(response.data);
  }

  async function register(data: { nome: string; email: string; matricula?: string; senha: string; tipo: 'usuario' }) {
    const response = await usuariosApi.create(data);
    localStorage.setItem(storageKey, JSON.stringify(response.data));
    setUser(response.data);
  }

  function logout() {
    localStorage.removeItem(storageKey);
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, register, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
