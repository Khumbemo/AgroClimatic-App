import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IS_DEMO } from '../config';
import FormError from '../components/data/FormError';

// Google "G" mark, inlined so the page has no external image requests.
const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const LoginPage: React.FC = () => {
  const { signInWithGoogle, user, authError } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Leave the login page as soon as a user is signed in (including demo mode).
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bento-card p-8 flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-lg bg-green-700 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-9 h-9 text-green-100" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 11 12 4l9 7" /><path d="M5 9.5V20h14V9.5" /><path d="M12 20v-5" />
            <path d="M12 16c-2.2 0-3.4-1.3-3.4-3.2 2 0 3.4 1.1 3.4 3.2Z" className="fill-green-300" stroke="none" />
            <path d="M12 15c0-2 1.3-3.2 3.4-3.2 0 2-1.4 3.2-3.4 3.2Z" className="fill-green-200" stroke="none" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">AgroClimatic</h1>
          <p className="text-sm text-gray-500 mt-1">Records, measurements and trials for forest-seedling nurseries.</p>
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try { await signInWithGoogle(); } finally { setBusy(false); }
          }}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-800 font-medium py-3 px-4 rounded-md hover:border-green-600 transition-colors disabled:opacity-60"
        >
          {!IS_DEMO && <GoogleMark />}
          {busy ? 'Signing in…' : IS_DEMO ? 'Continue to the demo' : 'Continue with Google'}
        </button>
        {authError && <div className="w-full"><FormError message={authError} /></div>}
        {IS_DEMO && <p className="text-xs text-gray-500 text-center">Demo mode: no account needed. Records are kept in this browser.</p>}
      </div>
    </div>
  );
};
export default LoginPage;
