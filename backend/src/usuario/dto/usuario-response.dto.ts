export class UsuarioResponseDto {
  id: string;
  nome: string;
  email: string;
  matricula: string | null;
  role: import('../../common/enums/usuario-role.enum').UsuarioRole;
  ativo: boolean;
  dataCriacao: Date;
}
