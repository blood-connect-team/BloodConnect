import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, KeyRound, Mail } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { useAuth } from '../../app/providers/auth-context';
import { devCodeLogin, devLoginEnabled, sendLoginCode, verifyLoginCode } from '../../services/auth';

/** Preview/local builds only: log in to the shared synthetic dev account with its dev code. */
function DevLogin() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await devCodeLogin(email, code);
      toast.success('Logged in to the dev account.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full h-10 px-3 rounded-lg border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-100';
  return (
    <form onSubmit={submit} className="mx-8 mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <p className="text-xs font-bold text-amber-900">Dev / test account (preview only, synthetic data)</p>
      <label htmlFor="dev-email" className="sr-only">Dev email</label>
      <input id="dev-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Dev email" className={field} />
      <label htmlFor="dev-code" className="sr-only">Dev code</label>
      <input id="dev-code" type="password" inputMode="numeric" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Dev code" className={field} />
      <button type="submit" disabled={busy || !email || !code} className="w-full h-10 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white text-sm font-bold">
        {busy ? 'Logging in…' : 'Dev login'}
      </button>
    </form>
  );
}

const safeNext = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard');

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const { user, profile, loading: authLoading } = useAuth();

  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  // Already logged in (or just came back from the email link): continue.
  useEffect(() => {
    if (authLoading || !user) return;
    navigate(profile ? next : `/register?next=${encodeURIComponent(next)}`, { replace: true });
  }, [authLoading, user, profile, next, navigate]);

  const requestCode = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await sendLoginCode(email);
      setStep('code');
      toast.success('Check your email.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('Enter the 6-digit code from the email.');
      return;
    }
    setBusy(true);
    try {
      await verifyLoginCode(email, code);
      toast.success('You are logged in.');
      // The effect above navigates once the session and profile are loaded.
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 text-sm';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-xl overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center bg-gradient-to-br from-red-600 to-red-800">
          <div className="mx-auto mb-4 flex justify-center brightness-0 invert">
            <Logo variant="compact" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Log in or sign up</h1>
          <p className="mt-2 text-sm text-white/85">
            {step === 'email' ? 'We will email you a login link. No password needed.' : `We sent a login email to ${email.trim()}. Open the link in it on this device, or enter the code if the email shows one.`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={requestCode} className="p-8 space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="block mb-2 text-sm font-bold text-gray-700">Email address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
              </div>
            </div>
            <button type="submit" disabled={busy} className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold text-sm flex items-center justify-center gap-2">
              {busy ? 'Sending…' : 'Send me a code'} <ArrowRight size={16} />
            </button>
            <p className="text-xs text-gray-500 text-center">New here? The same step creates your account.</p>
          </form>
        ) : (
          <form onSubmit={confirmCode} className="p-8 space-y-5" noValidate>
            <div>
              <label htmlFor="login-code" className="block mb-2 text-sm font-bold text-gray-700">6-digit code (if your email has one)</label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input id="login-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className={`${input} tracking-[0.4em] font-mono`} />
              </div>
              <p className="mt-2 text-xs text-gray-500">Only got a link? Just open it here; you will be logged in automatically.</p>
            </div>
            <button type="submit" disabled={busy} className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold text-sm">
              {busy ? 'Checking…' : 'Log in'}
            </button>
            <div className="flex justify-between text-xs">
              <button type="button" className="text-gray-500 hover:text-gray-700" onClick={() => { setStep('email'); setCode(''); }}>Use a different email</button>
              <button type="button" className="text-red-600 font-bold" disabled={busy} onClick={requestCode}>Send a new code</button>
            </div>
          </form>
        )}

        {devLoginEnabled && <DevLogin />}

        <div className="px-8 pb-8 text-center text-xs text-gray-500">
          By continuing you agree that your contact details are shared only with people whose blood request you accept. <Link to="/" className="text-red-600 font-semibold">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
