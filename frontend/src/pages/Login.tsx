import { useState } from 'react';
import type { FormEvent } from 'react';
import { Leaf, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pendingCollectorStorageKey, useAuth } from '../auth';
import { Button, ErrorAlert, Field, inputClass } from '../components/ui';
import { getErrorMessage } from '../utils';

const demoCredentials = { email: 'admin@ifpe.edu.br', senha: 'Admin@123' };

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function signIn(credentials: { email: string; senha: string }) {
    setSubmitting(true);
    setError('');
    try {
      await login(credentials.email, credentials.senha);
      navigate(sessionStorage.getItem(pendingCollectorStorageKey) ? '/descartes' : '/', { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn({ email, senha });
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await register({
        nome: nome.trim(),
        email: email.trim(),
        ...(matricula.trim() ? { matricula: matricula.trim() } : {}),
        senha,
        tipo: 'usuario',
      });
      navigate('/descartes', { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-lg sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white"><Leaf size={24} /></span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">EcoCampusIFPE</h1>
            <p className="text-sm text-slate-500">Gestão sustentável do campus</p>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{creatingAccount ? 'Criar acesso' : 'Acesse sua conta'}</h2>
        <p className="mt-2 text-sm text-slate-500">{creatingAccount ? 'Cadastre seus dados para começar.' : 'Entre para acompanhar a operação do campus.'}</p>
        {error && <div className="mt-5"><ErrorAlert message={error} /></div>}
        {creatingAccount ? (
          <form className="mt-6 space-y-4" onSubmit={(event) => void createAccount(event)}>
            <Field label="Nome completo">
              <input className={inputClass} autoComplete="name" required value={nome} onChange={(event) => setNome(event.target.value)} />
            </Field>
            <Field label="E-mail institucional ou pessoal">
              <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label="Matrícula / SIAPE (opcional)">
              <input className={inputClass} autoComplete="off" maxLength={50} value={matricula} onChange={(event) => setMatricula(event.target.value)} />
            </Field>
            <Field label="Senha" hint="Mínimo de 8 caracteres.">
              <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={senha} onChange={(event) => setSenha(event.target.value)} />
            </Field>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Criando acesso...' : 'Criar acesso'}</Button>
          </form>
        ) : (
          <>
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <Field label="E-mail">
                <input className={inputClass} type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="Senha">
                <input className={inputClass} type="password" autoComplete="current-password" required value={senha} onChange={(event) => setSenha(event.target.value)} />
              </Field>
              <Button type="submit" className="w-full" disabled={submitting}><LogIn size={16} />{submitting ? 'Entrando...' : 'Entrar'}</Button>
            </form>
            <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou<span className="h-px flex-1 bg-slate-200" /></div>
            <Button type="button" variant="secondary" className="w-full" disabled={submitting} onClick={() => void signIn(demoCredentials)}>Acesso rápido de demonstração</Button>
          </>
        )}
        <button
          type="button"
          className="mt-5 w-full text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          disabled={submitting}
          onClick={() => { setCreatingAccount((current) => !current); setError(''); }}
        >
          {creatingAccount ? 'Já tem conta? Entrar' : 'Não tem conta? Criar acesso'}
        </button>
      </section>
    </main>
  );
}
