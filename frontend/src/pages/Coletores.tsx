import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Pencil, Plus, QrCode, RotateCcw, Trash2, Truck } from 'lucide-react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { coletoresApi } from '../services/api';
import type { Coletor, PageMeta } from '../types';
import { getErrorMessage } from '../utils';
import { ActiveBadge, Button, ErrorAlert, Field, inputClass, Modal, PageTitle, Pagination, Panel } from '../components/ui';
import { useAuth } from '../auth';

type ColetorForm = { localizacao: string; capacidadeMaxima: number; ativo: boolean };
const emptyForm: ColetorForm = { localizacao: '', capacidadeMaxima: 30, ativo: true };

export default function Coletores() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin';
  const [items, setItems] = useState<Coletor[]>([]);
  const [meta, setMeta] = useState<PageMeta>();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Coletor | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [addingVolume, setAddingVolume] = useState<Coletor | null>(null);
  const [form, setForm] = useState<ColetorForm>(emptyForm);
  const [volume, setVolume] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await coletoresApi.list(page);
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

  function openForm(item?: Coletor) {
    setEditing(item ?? null);
    setIsCreating(!item);
    setForm(item ? { localizacao: item.localizacao, capacidadeMaxima: Number(item.capacidadeMaxima), ativo: item.ativo } : { ...emptyForm });
    setError('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await coletoresApi.update(editing.id, form);
      else await coletoresApi.create(form);
      setEditing(null);
      setIsCreating(false);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function changeVolume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addingVolume) return;
    setSaving(true);
    setError('');
    try {
      await coletoresApi.addItems(addingVolume.id, Number(volume));
      setAddingVolume(null);
      setVolume('');
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function reset(item: Coletor) {
    if (!window.confirm(`Esvaziar o coletor em ${item.localizacao}? Os descartes vinculados serão finalizados.`)) return;
    try {
      await coletoresApi.reset(item.id);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function remove(item: Coletor) {
    if (!window.confirm(`Excluir o coletor em ${item.localizacao}?`)) return;
    try {
      await coletoresApi.remove(item.id);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  return (
    <>
      <PageTitle title="Coletores" description="Acompanhe os pontos de coleta e a capacidade de cada lixeira inteligente." action={canManage ? <Button onClick={() => openForm()}><Plus size={16} /> Novo coletor</Button> : undefined} />
      {error && <ErrorAlert message={error} />}
      <Panel>
        <div className="mb-4 flex items-center gap-2"><Truck size={18} className="text-emerald-600" /><h2 className="font-bold text-slate-900">Pontos de coleta</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 font-semibold">Localização</th><th className="pb-3 font-semibold">Ocupação</th><th className="pb-3 font-semibold">Situação</th><th className="pb-3 text-right font-semibold">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const percent = item.capacidadeMaxima ? item.volumeAtual / item.capacidadeMaxima * 100 : 0;
                const alert = percent >= 80;
                return <tr key={item.id}>
                  <td className="py-4 font-semibold text-slate-800">{item.localizacao}</td>
                  <td className="py-4">
                    <div className="flex min-w-52 items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${alert ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(percent, 100)}%` }} /></div>
                      <span className="whitespace-nowrap text-xs text-slate-500">{item.volumeAtual} / {item.capacidadeMaxima} itens</span>
                      {alert && <AlertTriangle size={15} className="text-amber-600" aria-label="Alerta de ocupação" />}
                    </div>
                  </td>
                  <td className="py-4"><ActiveBadge active={item.ativo} /></td>
                  <td className="py-4"><div className="flex justify-end gap-1">
                    {canManage && <Button variant="ghost" aria-label="Adicionar itens" title="Adicionar itens" onClick={() => { setAddingVolume(item); setVolume(''); }}><Plus size={16} /></Button>}
                    <Button variant="ghost" aria-label="Esvaziar coletor" title="Esvaziar coletor" onClick={() => void reset(item)}><RotateCcw size={16} /></Button>
                    <Button variant="ghost" aria-label="Simular QR Code" title="Simular QR Code" onClick={() => navigate(`/descartes?coletorId=${encodeURIComponent(item.id)}`)}><QrCode size={16} /></Button>
                    {canManage && <Button variant="ghost" aria-label="Editar coletor" onClick={() => openForm(item)}><Pencil size={16} /></Button>}
                    {canManage && <Button variant="ghost" aria-label="Excluir coletor" onClick={() => void remove(item)}><Trash2 size={16} className="text-rose-600" /></Button>}
                  </div></td>
                </tr>;
              })}
              {!loading && !error && items.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-slate-500">Nenhum coletor cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
        {loading && <p className="py-5 text-center text-sm text-slate-500">Carregando coletores...</p>}
        <Pagination meta={meta} onPage={setPage} />
      </Panel>
      {(editing || isCreating) && <Modal title={editing ? 'Editar coletor' : 'Novo coletor'} onClose={() => { setEditing(null); setIsCreating(false); }}>
        <form className="space-y-4" onSubmit={(event) => void save(event)}>
          <Field label="Localização"><input className={inputClass} required maxLength={255} placeholder="Ex.: Bloco A · Pátio central" value={form.localizacao} onChange={(event) => setForm({ ...form, localizacao: event.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Capacidade máxima (itens)"><input className={inputClass} type="number" step="1" min="1" max="30" required value={form.capacidadeMaxima} onChange={(event) => setForm({ ...form, capacidadeMaxima: Number(event.target.value) })} /></Field>
            <Field label="Situação"><select className={inputClass} value={String(form.ativo)} onChange={(event) => setForm({ ...form, ativo: event.target.value === 'true' })}><option value="true">Ativo</option><option value="false">Inativo</option></select></Field>
          </div>
          {editing && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Ocupação atual: <strong>{editing.volumeAtual} itens</strong>. Para ajustar, use a ação de adicionar itens ou esvaziar.</p>}
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => { setEditing(null); setIsCreating(false); }}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar coletor'}</Button></div>
        </form>
      </Modal>}
      {addingVolume && <Modal title="Adicionar itens" onClose={() => setAddingVolume(null)}>
        <form className="space-y-4" onSubmit={(event) => void changeVolume(event)}>
          <p className="text-sm text-slate-500">Coletor: <strong className="text-slate-800">{addingVolume.localizacao}</strong> · ocupação atual {addingVolume.volumeAtual} itens</p>
          <Field label="Quantidade de itens a adicionar"><input className={inputClass} type="number" min="1" max="30" step="1" required value={volume} onChange={(event) => setVolume(event.target.value)} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAddingVolume(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Atualizando...' : 'Adicionar itens'}</Button></div>
        </form>
      </Modal>}
    </>
  );
}
