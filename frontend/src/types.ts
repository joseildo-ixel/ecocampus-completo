export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PageResponse<T> {
  data: T[];
  meta: PageMeta;
}

export type UsuarioRole = 'admin' | 'usuario' | 'coletor';
export type DescarteStatus = 'pendente' | 'processado' | 'finalizado';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  matricula?: string | null;
  role: UsuarioRole;
  ativo: boolean;
  dataCriacao: string;
}

export interface Objeto {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  pesoKg: number;
  pertencePatrimonio: boolean;
  ativo: boolean;
  dataCriacao: string;
}

export interface Coletor {
  id: string;
  localizacao: string;
  capacidadeMaxima: number;
  volumeAtual: number;
  ativo: boolean;
  dataCriacao: string;
}

export interface DescarteItem {
  id: string;
  objetoId: string;
  quantidade: number;
  objeto: {
    nome: string;
    tipo: string;
    pesoKg: number;
  };
}

export interface Descarte {
  id: string;
  status: DescarteStatus;
  dataDescarte: string;
  pesoKg: number;
  tipoResiduo: string;
  destino: string;
  observacoes: string | null;
  dataCriacao: string;
  usuarioId: string;
  coletorId: string | null;
  itens?: DescarteItem[];
  usuario?: Pick<Usuario, 'id' | 'nome' | 'email'>;
  coletor?: Pick<Coletor, 'localizacao'>;
}

export interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
}
