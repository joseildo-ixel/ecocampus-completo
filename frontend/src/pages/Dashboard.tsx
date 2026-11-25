import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Boxes, CircleCheck, Leaf, Plus, Recycle, Scale } from 'lucide-react';
import { coletoresApi, descartesApi } from '../services/api';
import type { Coletor, Descarte } from '../types';
import { formatKg, getErrorMessage } from '../utils';
import { Button, ErrorAlert, PageTitle, Panel } from '../components/ui';
import { useAuth } from '../auth';

export default function Dashboard() {
  const { user } = useAuth();
  const [coletores, setColetores] = useState<Coletor[]>([]);
  const [descartes, setDescartes] = useState<Descarte[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [report, collectorPage] = await Promise.all([
        descartesApi.report(),
        coletoresApi.list(1, 100),
      ]);
      setDescartes(report.data);
      setColetores(collectorPage.data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function resetCollector(collector: Coletor) {
    if (!window.confirm(`Esvaziar o coletor em ${collector.localizacao}? Os descartes vinculados serão finalizados.`)) return;
    setResetting(collector.id);
    setError('');
    try {
      const response = await coletoresApi.reset(collector.id);
      setColetores((items) => items.map((item) => item.id === collector.id ? response.data : item));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setResetting(null);
    }
  }

  const activeCollectors = coletores.filter((collector) => collector.ativo).length;
  const alerts = coletores.filter((collector) => collector.ativo && collector.volumeAtual / collector.capacidadeMaxima >= 0.8).length;
  const totalWeight = descartes.reduce((sum, item) => sum + Number(item.pesoKg), 0);

  return (
    <>
      <PageTitle
        title="Visão geral"
        description={user?.role === 'admin'
          ? 'Você tem acesso às ferramentas de gestão, usuários e operação dos coletores.'
          : 'Acompanhe a operação de resíduos e eletrônicos do campus em tempo real.'}
        action={<Link to="/descartes" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"><Plus size={16} /> Registrar descarte</Link>}
      />
      {loading ? <p className="py-12 text-center text-sm text-slate-500">Carregando indicadores do campus...</p> : error ? <ErrorAlert message={error} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Recycle} label="Descartes registrados" value={descartes.length.toLocaleString('pt-BR')} detail="histórico completo" tone="emerald" />
            <SummaryCard icon={Scale} label="Resíduos destinados" value={formatKg(totalWeight)} detail="peso total registrado" tone="blue" />
            <SummaryCard icon={Leaf} label="Coletores ativos" value={activeCollectors.toString()} detail={`de ${coletores.length} pontos cadastrados`} tone="green" />
            <SummaryCard icon={AlertTriangle} label="Alertas CINFRA" value={alerts.toString()} detail="ocupação igual ou acima de 80%" tone={alerts ? 'amber' : 'green'} />
          </div>

          <Panel className="mt-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Coletores inteligentes</h2>
                <p className="mt-1 text-sm text-slate-500">Ocupação atual e pontos que precisam de atenção.</p>
              </div>
              {user?.role !== 'usuario' && <Link to="/coletores" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">Gerenciar coletores <ArrowRight size={15} /></Link>}
            </div>
            {coletores.length === 0 ? (
              <EmptyState icon={Boxes} message="Nenhum coletor cadastrado ainda." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {coletores.map((collector) => {
                  const percentage = collector.capacidadeMaxima > 0 ? Math.min((collector.volumeAtual / collector.capacidadeMaxima) * 100, 100) : 0;
                  const alert = percentage >= 80;
                  return (
                    <div key={collector.id} className={`rounded-2xl border p-4 ${alert ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-slate-50/70'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{collector.localizacao}</p>
                          <p className="mt-1 text-xs text-slate-500">{collector.volumeAtual} de {collector.capacidadeMaxima} itens</p>
                        </div>
                        {alert && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800"><AlertTriangle size={13} /> CINFRA</span>}
                      </div>
                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full transition-all ${alert ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{percentage.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% ocupado</span>
                        <span>{collector.ativo ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      {user?.role !== 'usuario' && (
                        <Button
                          variant="secondary"
                          className="mt-4 w-full"
                          disabled={!collector.ativo || resetting === collector.id}
                          onClick={() => void resetCollector(collector)}
                        >
                          <CircleCheck size={15} /> {resetting === collector.id ? 'Esvaziando...' : 'Esvaziar / Resetar Coletor'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel className="mt-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Atividade recente</h2>
                <p className="mt-1 text-sm text-slate-500">Últimos registros de descarte.</p>
              </div>
              <Link to="/descartes" className="text-sm font-semibold text-emerald-700">Ver histórico</Link>
            </div>
            {descartes.length === 0 ? <EmptyState icon={Recycle} message="Os descartes registrados aparecerão aqui." /> : (
              <div className="divide-y divide-slate-100">
                {descartes.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.tipoResiduo}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(item.dataDescarte).toLocaleDateString('pt-BR')} · {item.destino}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{formatKg(Number(item.pesoKg))}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}

function SummaryCard({ icon: Icon, label, value, detail, tone }: {
  icon: typeof Recycle;
  label: string;
  value: string;
  detail: string;
  tone: 'emerald' | 'blue' | 'green' | 'amber';
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-sky-50 text-sky-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p></div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon size={20} /></span>
      </div>
      <p className="mt-3 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Recycle; message: string }) {
  return <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500"><Icon size={24} className="text-slate-300" />{message}</div>;
}
