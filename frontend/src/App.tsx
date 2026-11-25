import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  Leaf,
  Menu,
  Recycle,
  Users,
  X,
} from 'lucide-react';
import { pendingCollectorStorageKey, useAuth } from './auth';
import Dashboard from './pages/Dashboard';
import Descartes from './pages/Descartes';
import Coletores from './pages/Coletores';
import Usuarios from './pages/Usuarios';
import Login from './pages/Login';
import type { UsuarioRole } from './types';

const navigation: Array<{ to: string; label: string; icon: typeof BarChart3; end?: boolean; roles: UsuarioRole[] }> = [
  { to: '/', label: 'Visão geral', icon: BarChart3, end: true, roles: ['admin', 'coletor', 'usuario'] },
  { to: '/descartes', label: 'Descartes', icon: Recycle, roles: ['admin', 'coletor', 'usuario'] },
  { to: '/coletores', label: 'Coletores', icon: Leaf, roles: ['admin', 'coletor'] },
  { to: '/usuarios', label: 'Usuários', icon: Users, roles: ['admin'] },
];

function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const visibleNavigation = navigation.filter((item) => item.roles.includes(user.role));
  const currentPage = visibleNavigation.find((item) => item.to === location.pathname);
  const roleNames = { admin: 'ADMIN', coletor: 'COLETOR', usuario: 'USUARIO' } as const;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {menuOpen && <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-900 text-white transition-transform lg:static lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500"><Leaf size={22} /></div>
          <div>
            <p className="font-bold tracking-tight">EcoCampus<span className="text-emerald-400">IFPE</span></p>
            <p className="text-xs text-slate-400">Gestão sustentável</p>
          </div>
          <button className="ml-auto rounded-lg p-2 text-slate-400 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Operação do campus</p>
          {visibleNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              <Icon size={18} />
              {label}
              {location.pathname === to && <ChevronRight className="ml-auto" size={16} />}
            </NavLink>
          ))}
        </nav>
        <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-emerald-300"><Recycle size={16} /><span className="text-xs font-semibold">IFPE · Campus sustentável</span></div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">Acompanhe o ciclo dos resíduos e fortaleça boas práticas ambientais.</p>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
            <p className="text-sm font-semibold text-slate-700">{currentPage?.label ?? 'EcoCampusIFPE'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-700">{user.nome}</p>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{roleNames[user.role]}</span>
            </div>
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={logout}>Sair</button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const collectorId = new URLSearchParams(location.search).get('coletorId');
    if (!collectorId) return;
    sessionStorage.setItem(pendingCollectorStorageKey, collectorId);
    navigate(user ? '/descartes' : '/login', { replace: true });
  }, [location.search, navigate, user]);

  const qrPending = Boolean(
    new URLSearchParams(location.search).get('coletorId')
    || sessionStorage.getItem(pendingCollectorStorageKey),
  );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={qrPending ? '/descartes' : '/'} replace /> : <Login />} />
      <Route path="/objetos" element={<Navigate to="/" replace />} />
      {user ? (
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/descartes" element={<Descartes />} />
          {user.role !== 'usuario' && <Route path="/coletores" element={<Coletores />} />}
          {user.role === 'admin' && <Route path="/usuarios" element={<Usuarios />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to={`/login${location.search}`} replace />} />
      )}
    </Routes>
  );
}
