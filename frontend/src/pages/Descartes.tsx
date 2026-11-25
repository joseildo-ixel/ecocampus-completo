import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { coletoresApi, descartesApi, objetosApi, usuariosApi } from '../services/api';
import type { Coletor, Descarte, DescarteStatus, PageMeta, Usuario } from '../types';
import { formatDate, formatKg, getErrorMessage } from '../utils';
import { Button, ErrorAlert, Field, inputClass, Modal, PageTitle, Pagination, Panel } from '../components/ui';
import { pendingCollectorStorageKey, useAuth } from '../auth';

type DisposalForm = {
  tipoResiduo: string;
  pesoKg: number | '';
  objetoNome: string;
  quantidade: number;
  observacoes: string;
  usuarioId: string;
  coletorId: string;
};

const initialForm: DisposalForm = {
  tipoResiduo: '',
  pesoKg: '',
  objetoNome: '',
  quantidade: 1,
  observacoes: '',
  usuarioId: '',
  coletorId: '',
};

const statusNames: Record<DescarteStatus, string> = {
  pendente: 'Pendente',
  processado: 'Processado',
  finalizado: 'Finalizado',
};

export default function Descartes() {
  const { user } = useAuth();
  const location = useLocation();
  const handledQrCollector = useRef<string | null>(null);
  const [items, setItems] = useState<Descarte[]>([]);
  const [meta, setMeta] = useState<PageMeta>();
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [collectors, setCollectors] = useState<Coletor[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<DisposalForm>(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await descartesApi.list(page);
      setItems(response.data.data);
      setMeta(response.data.meta);
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const openCreate = useCallback(async (preselectedCollectorId?: string) => {
    setError('');
    try {
      const [userPage, collectorPage, qrCollector] = await Promise.all([
        user?.role === 'usuario' ? Promise.resolve(undefined) : usuariosApi.list(1, 100),
        coletoresApi.list(1, 100),
        preselectedCollectorId ? coletoresApi.get(preselectedCollectorId) : Promise.resolve(undefined),
      ]);
      const activeCollectors = collectorPage.data.data.filter((collector) => collector.ativo);
      if (qrCollector && !qrCollector.data.ativo) {
        sessionStorage.removeItem(pendingCollectorStorageKey);
        setError('O coletor indicado pelo QR Code está inativo.');
        return;
      }
      const selectedCollector = qrCollector?.data;
      setUsers(userPage?.data.data.filter((item) => item.ativo) ?? (user ? [user] : []));
      setCollectors(selectedCollector && !activeCollectors.some((collector) => collector.id === selectedCollector.id)
        ? [...activeCollectors, selectedCollector]
        : activeCollectors);
      setForm({
        ...initialForm,
        usuarioId: user?.role === 'usuario' ? user.id : '',
        coletorId: selectedCollector?.id ?? '',
      });
      setIsCreating(true);
      if (preselectedCollectorId) sessionStorage.removeItem(pendingCollectorStorageKey);
    } catch (requestError) {
      if (preselectedCollectorId) sessionStorage.removeItem(pendingCollectorStorageKey);
      setError(getErrorMessage(requestError));
    }
  }, [user]);

  useEffect(() => {
    const queryCollectorId = new URLSearchParams(location.search).get('coletorId');
    if (queryCollectorId) sessionStorage.setItem(pendingCollectorStorageKey, queryCollectorId);
    const pendingCollectorId = queryCollectorId ?? sessionStorage.getItem(pendingCollectorStorageKey);
    if (!pendingCollectorId || handledQrCollector.current === pendingCollectorId) return;
    handledQrCollector.current = pendingCollectorId;
    void openCreate(pendingCollectorId).finally(() => {
      if (handledQrCollector.current === pendingCollectorId) handledQrCollector.current = null;
    });
  }, [location.search, openCreate]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const objetoNome = form.objetoNome.trim();
      const quantidade = form.quantidade;
      const pesoKg = Number(form.pesoKg || 0);
      const coletor = collectors.find((item) => item.id === form.coletorId);
      if (coletor && (coletor.volumeAtual + quantidade > coletor.capacidadeMaxima || coletor.volumeAtual + quantidade > 30)) {
        setError('O descarte excede a capacidade máxima de itens do coletor (máximo de 30 itens).');
        return;
      }
      const objetoPage = await objetosApi.list(1, 100, objetoNome);
      const matchingObjects = objetoPage.data.data.filter(
        (objeto) => objeto.nome.trim().toLocaleLowerCase('pt-BR') === objetoNome.toLocaleLowerCase('pt-BR'),
      );
      if (matchingObjects.some((objeto) => objeto.pertencePatrimonio)) {
        setError('Proibido: Não é permitido descartar equipamentos que pertencem ao patrimônio do IFPE.');
        return;
      }

      const objetoExistente = matchingObjects.find((objeto) => objeto.ativo);
      if (matchingObjects.length > 0 && !objetoExistente) {
        setError('O objeto informado está cadastrado, mas inativo. Informe outro objeto ou solicite a reativação.');
        return;
      }

      const objeto = objetoExistente ?? (await objetosApi.create({
        nome: objetoNome,
        descricao: `Criado automaticamente para registrar o descarte de ${objetoNome}.`,
        tipo: form.tipoResiduo,
        pesoKg: Math.max(0.01, Number((pesoKg / quantidade).toFixed(2))),
        pertencePatrimonio: false,
      })).data;

      await descartesApi.create({
        tipoResiduo: form.tipoResiduo,
        ...(pesoKg > 0 ? { pesoKg } : {}),
        destino: 'Triagem CINFRA',
        observacoes: [
          form.observacoes.trim(),
          `Objeto descartado: ${objetoNome} (${quantidade}x)`,
        ].filter(Boolean).join('\n'),
        usuarioId: form.usuarioId,
        coletorId: form.coletorId,
        itens: [{ objetoId: objeto.id, quantidade }],
      });
      setIsCreating(false);
      setForm({ ...initialForm, usuarioId: user?.role === 'usuario' ? user.id : '' });
      await loadHistory();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Descarte) {
    if (!window.confirm(`Excluir o descarte de ${item.usuario?.nome ?? 'usuário'}? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(item.id);
    setError('');
    try {
      await descartesApi.remove(item.id);
      if (items.length === 1 && page > 1) setPage((currentPage) => currentPage - 1);
      else await loadHistory();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  }

  function canDelete(item: Descarte) {
    return user?.role === 'admin' || item.usuarioId === user?.id;
  }

  return (
    <>
      <PageTitle title="Registrar descarte" description="Registre a destinação de resíduos com rastreabilidade de usuário e coletor." action={<Button onClick={() => void openCreate()}><Plus size={16} /> Novo registro</Button>} />
      {error && <ErrorAlert message={error} />}
      <Panel>
        <div className="mb-4 flex items-center gap-2"><CalendarDays size={18} className="text-emerald-600" /><h2 className="font-bold text-slate-900">Histórico de descartes</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 font-semibold">Data</th><th className="pb-3 font-semibold">Resíduo</th><th className="pb-3 font-semibold">Objeto descartado</th><th className="pb-3 font-semibold">Destino</th><th className="pb-3 font-semibold">Peso</th><th className="pb-3 font-semibold">Usuário</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 text-right font-semibold">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 text-slate-500">{formatDate(item.dataDescarte)}</td>
                  <td className="py-4 font-semibold capitalize text-slate-800">{item.tipoResiduo}</td>
                  <td className="py-4 font-semibold text-slate-800">{getDiscardedObjectLabel(item)}</td>
                  <td className="py-4 text-slate-500">{item.destino}</td>
                  <td className="py-4 font-semibold text-slate-700">{Number(item.pesoKg) > 0 ? formatKg(Number(item.pesoKg)) : 'Não informado'}</td>
                  <td className="py-4 text-slate-600"><span className="font-medium text-slate-800">{item.usuario?.nome ?? '—'}</span>{item.usuario?.email && <span className="mt-1 block text-xs text-slate-500">{item.usuario.email}</span>}</td>
                  <td className="py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'finalizado' ? 'bg-slate-100 text-slate-600' : item.status === 'processado' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>{statusNames[item.status]}</span></td>
                  <td className="py-4 text-right">{canDelete(item) && <Button variant="ghost" aria-label="Excluir descarte" title="Excluir descarte" disabled={deletingId === item.id} onClick={() => void remove(item)}><Trash2 size={16} className="text-rose-600" /></Button>}</td>
                </tr>
              ))}
              {!loading && !error && items.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-slate-500">Nenhum descarte registrado nesta página.</td></tr>}
            </tbody>
          </table>
        </div>
        {loading && <p className="py-5 text-center text-sm text-slate-500">Carregando histórico...</p>}
        <Pagination meta={meta} onPage={setPage} />
      </Panel>

      {isCreating && <Modal title="Novo registro de descarte" onClose={() => setIsCreating(false)}>
        {error && <ErrorAlert message={error} />}
        <form className="space-y-4" onSubmit={(event) => void save(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de resíduo"><input className={inputClass} required maxLength={50} placeholder="Ex.: eletrônico, papel, plástico" value={form.tipoResiduo} onChange={(event) => setForm({ ...form, tipoResiduo: event.target.value })} /></Field>
            <Field label="Peso total (kg) (opcional)" hint="Se informado, entre 0,01 e 999,99 kg.">
              <input className={inputClass} type="number" step="0.01" min="0.01" max="999.99" value={form.pesoKg} onChange={(event) => setForm({ ...form, pesoKg: event.target.value === '' ? '' : Number(event.target.value) })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Objeto a ser descartado">
              <input className={inputClass} required maxLength={255} placeholder="Ex.: Mouse óptico, Teclado, Cabo HDMI, Pilhas AA" value={form.objetoNome} onChange={(event) => setForm({ ...form, objetoNome: event.target.value })} />
            </Field>
            <Field label="Quantidade de itens">
              <input className={inputClass} type="number" min="1" max="30" step="1" required value={form.quantidade} onChange={(event) => setForm({ ...form, quantidade: Number(event.target.value) || 1 })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Usuário responsável"><select className={inputClass} required disabled={user?.role === 'usuario'} value={form.usuarioId} onChange={(event) => setForm({ ...form, usuarioId: event.target.value })}><option value="">Selecione um usuário</option>{users.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.email}</option>)}</select></Field>
            <Field label="Coletor ativo"><select className={inputClass} required value={form.coletorId} onChange={(event) => setForm({ ...form, coletorId: event.target.value })}><option value="">Selecione um coletor</option>{collectors.map((collector) => <option key={collector.id} value={collector.id}>{collector.localizacao} · {collector.volumeAtual} / {collector.capacidadeMaxima} itens</option>)}</select></Field>
          </div>
          <Field label="Observações (opcional)"><textarea className={`${inputClass} min-h-16`} value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} /></Field>
          {collectors.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Cadastre ao menos um coletor ativo para registrar o descarte.</p>}
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>Cancelar</Button><Button type="submit" disabled={saving || !form.usuarioId || !collectors.length || form.quantidade < 1}>{saving ? 'Registrando...' : 'Registrar descarte'}</Button></div>
        </form>
      </Modal>}
    </>
  );
}

function getDiscardedObjectLabel(item: Descarte): string {
  if (item.itens?.length) {
    return item.itens
      .map(({ objeto, quantidade }) => `${objeto.nome} (${quantidade}x)`)
      .join(', ');
  }

  const observation = item.observacoes?.split(/\r?\n/).find((line) => line.startsWith('Objeto descartado: '));
  return observation?.slice('Objeto descartado: '.length) ?? '—';
}
