import axios from 'axios';
import type {
  Coletor,
  Descarte,
  Objeto,
  PageResponse,
  Usuario,
  UsuarioRole,
} from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

export const pageSize = 10;

export const endpoints = {
  usuarios: '/usuarios',
  objetos: '/objetos',
  coletores: '/api/coletor',
  descartes: '/descarte',
} as const;

export const usuariosApi = {
  login: (email: string, senha: string) => api.post<Usuario>(`${endpoints.usuarios}/login`, { email, senha }),
  list: (page = 1, limit = pageSize) => api.get<PageResponse<Usuario>>(endpoints.usuarios, { params: { page, limit } }),
  create: (data: {
    nome: string;
    email: string;
    senha: string;
    role?: UsuarioRole;
    tipo?: UsuarioRole;
    matricula?: string;
    ativo?: boolean;
  }) =>
    api.post<Usuario>(endpoints.usuarios, data),
  update: (id: string, data: Partial<{ nome: string; email: string; senha: string; role: UsuarioRole; matricula: string; ativo: boolean }>) =>
    api.patch<Usuario>(`${endpoints.usuarios}/${id}`, data),
  remove: (id: string) => api.delete(`${endpoints.usuarios}/${id}`),
};

export const objetosApi = {
  list: (page = 1, limit = pageSize, nome?: string) =>
    api.get<PageResponse<Objeto>>(endpoints.objetos, { params: { page, limit, nome } }),
  create: (data: Pick<Objeto, 'nome' | 'descricao' | 'tipo' | 'pesoKg'> & { pertencePatrimonio: false }) =>
    api.post<Objeto>(endpoints.objetos, data),
};

export const coletoresApi = {
  list: (page = 1, limit = pageSize) => api.get<PageResponse<Coletor>>(endpoints.coletores, { params: { page, limit } }),
  get: (id: string) => api.get<Coletor>(`${endpoints.coletores}/${id}`),
  create: (data: Pick<Coletor, 'localizacao' | 'capacidadeMaxima' | 'ativo'>) =>
    api.post<Coletor>(endpoints.coletores, data),
  update: (id: string, data: Partial<Pick<Coletor, 'localizacao' | 'capacidadeMaxima' | 'ativo'>>) =>
    api.patch<Coletor>(`${endpoints.coletores}/${id}`, data),
  addItems: (id: string, quantidade: number) =>
    api.post<Coletor>(`${endpoints.coletores}/${id}/atualizar`, { quantidade }),
  reset: (id: string) => api.post<Coletor>(`${endpoints.coletores}/${id}/reset`),
  remove: (id: string) => api.delete(`${endpoints.coletores}/${id}`),
};

export const descartesApi = {
  list: (page = 1, limit = pageSize) => api.get<PageResponse<Descarte>>(endpoints.descartes, { params: { page, limit } }),
  report: () => api.get<Descarte[]>(`${endpoints.descartes}/relatorio/completo`),
  create: (data: {
    tipoResiduo: string;
    pesoKg?: number;
    destino: string;
    observacoes?: string;
    usuarioId: string;
    coletorId: string;
    itens?: Array<{ objetoId: string; quantidade: number }>;
  }) => api.post<Descarte>(endpoints.descartes, data),
  update: (id: string, data: Partial<Pick<Descarte, 'status' | 'dataDescarte' | 'pesoKg' | 'tipoResiduo' | 'destino' | 'observacoes'>>) =>
    api.patch<Descarte>(`${endpoints.descartes}/${id}`, data),
  remove: (id: string) => api.delete(`${endpoints.descartes}/${id}`),
};
