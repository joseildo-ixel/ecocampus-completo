import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { FormEvent } from 'react';
import { usuariosApi } from '../services/api';
import type { PageMeta, Usuario, UsuarioRole } from '../types';
import { getErrorMessage } from '../utils';
import { ActiveBadge, Button, ErrorAlert, Field, inputClass, Modal, PageTitle, Pagination, Panel } from '../components/ui';

type UsuarioForm = {
  nome: string;
  email: string;
  senha: string;
  role: UsuarioRole;
  ativo: boolean;
};

const emptyForm: UsuarioForm = { nome: '', email: '', senha: '', role: 'usuario', ativo: true };

export default function Usuarios() {
  const [items, setItems] = useState<Usuario[]>([]);
  const [meta, setMeta] = useState<PageMeta>();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<UsuarioForm>(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usuariosApi.list(page);
      setItems(response.data.data);
      setMeta(response.data.meta);
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  function openForm(usuario?: Usuario) {
    setEditing(usuario ?? null);
    setIsCreating(!usuario);
    setForm(usuario ? { nome: usuario.nome, email: usuario.email, senha: '', role: usuario.role, ativo: usuario.ativo } : emptyForm);
    setError('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const { senha, ...data } = form;
        await usuariosApi.update(editing.id, senha ? { ...data, senha } : data);
      } else {
        await usuariosApi.create(form);
      }
      setEditing(null);
      setIsCreating(false);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function remove(usuario: Usuario) {
    if (!window.confirm(`Excluir o usuário ${usuario.nome}?`)) return;
    try {
      await usuariosApi.remove(usuario.id);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  return (
    <>
      <PageTitle title="Usuários" description="Gerencie as pessoas que registram e acompanham os descartes." action={<Button onClick={() => openForm()}><Plus size={16} /> Novo usuário</Button>} />
      {error && <ErrorAlert message={error} />}
      <Panel>
        <div className="mb-4 flex items-center gap-2"><Users size={18} className="text-emerald-600" /><h2 className="font-bold text-slate-900">Equipe cadastrada</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 font-semibold">Nome</th><th className="pb-3 font-semibold">E-mail</th><th className="pb-3 font-semibold">Perfil</th><th className="pb-3 font-semibold">Situação</th><th className="pb-3 text-right font-semibold">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((usuario) => (
                <tr key={usuario.id}>
                  <td className="py-4 font-semibold text-slate-800">{usuario.nome}</td>
                  <td className="py-4 text-slate-500">{usuario.email}</td>
                  <td className="py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{usuario.role}</span></td>
                  <td className="py-4"><ActiveBadge active={usuario.ativo} /></td>
                  <td className="py-4"><div className="flex justify-end gap-1"><Button variant="ghost" aria-label="Editar usuário" onClick={() => openForm(usuario)}><Pencil size={16} /></Button><Button variant="ghost" aria-label="Excluir usuário" onClick={() => void remove(usuario)}><Trash2 size={16} className="text-rose-600" /></Button></div></td>
                </tr>
              ))}
              {!loading && !error && items.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
        {loading && <p className="py-5 text-center text-sm text-slate-500">Carregando usuários...</p>}
        <Pagination meta={meta} onPage={setPage} />
      </Panel>
      {(editing || isCreating) && <Modal title={editing ? 'Editar usuário' : 'Novo usuário'} onClose={() => { setEditing(null); setIsCreating(false); }}>
        <form className="space-y-4" onSubmit={(event) => void save(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome"><input className={inputClass} required value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} /></Field>
            <Field label="E-mail"><input className={inputClass} type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          </div>
          <Field label={editing ? 'Nova senha (opcional)' : 'Senha'} hint={editing ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 6 caracteres.'}>
            <input className={inputClass} type="password" minLength={6} required={!editing} autoComplete="new-password" value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Perfil">
              <select className={inputClass} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UsuarioRole })}>
                <option value="admin">Administrador</option><option value="usuario">Usuário</option><option value="coletor">Coletor</option>
              </select>
            </Field>
            <Field label="Situação">
              <select className={inputClass} value={String(form.ativo)} onChange={(event) => setForm({ ...form, ativo: event.target.value === 'true' })}>
                <option value="true">Ativo</option><option value="false">Inativo</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => { setEditing(null); setIsCreating(false); }}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar usuário'}</Button></div>
        </form>
      </Modal>}
    </>
  );
}
