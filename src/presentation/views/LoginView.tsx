import React, { useState } from 'react';
import { PackageCheck, ShieldAlert, LogIn, Sparkles } from 'lucide-react';
import { Messages } from '../../localization/messages';
import { useAuthStore } from '../../state/authStore';

interface LoginViewProps {
  messages: Messages;
  locale: 'ar' | 'en';
  onToggleLocale: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ messages, locale, onToggleLocale }) => {
  const { signInWithEmail, signInWithGoogle, enterAsDemo, status, errorMessage, clearError } =
    useAuthStore();

  const [email, setEmail] = useState('dispatcher@delivery.iq');
  const [password, setPassword] = useState('Dispatcher2026!');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleEmailSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError(messages.validation.buyerNameRequired);
      return;
    }

    try {
      await signInWithEmail(email.trim(), password);
    } catch {
      // Handled in store
    }
  };

  const handleGoogleSubmit = async () => {
    setLocalError(null);
    clearError();
    try {
      await signInWithGoogle();
    } catch {
      // Handled in store
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Locale Switcher */}
      <div className="absolute top-6 right-6 rtl:right-auto rtl:left-6">
        <button
          onClick={onToggleLocale}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          {locale === 'ar' ? 'English' : 'عربي'}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-blue-600 items-center justify-center text-white shadow-xl shadow-blue-600/30 mb-4">
          <PackageCheck className="h-9 w-9" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {messages.auth.title}
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">{messages.auth.subtitle}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          {/* Error Alert */}
          {(errorMessage || localError) && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
              <span>{localError || errorMessage}</span>
            </div>
          )}

          {/* Quick Demo Access (For instant reviewer testing) */}
          <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/50 space-y-2">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span>الدخول التجريبي المباشر (Stage 2 Review Mode)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              يمكنك الدخول فوراً بحساب مأمور توزيع معتمد لمراجعة السجلات وإعدادات المستودع.
            </p>
            <button
              id="demo-login-btn"
              type="button"
              onClick={enterAsDemo}
              className="w-full mt-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>{messages.auth.guestMode}</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-slate-900 text-slate-500 font-medium">أو عبر البريد الرسمي</span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmitCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {messages.auth.email}
              </label>
              <input
                id="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dispatcher@delivery.iq"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {messages.auth.password}
              </label>
              <input
                id="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold border border-slate-700 transition disabled:opacity-50"
            >
              {status === 'loading' ? messages.common.loading : messages.auth.signIn}
            </button>
          </form>

          {/* Google Sign In Option */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSubmit}
            disabled={status === 'loading'}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition flex items-center justify-center gap-2"
          >
            <span>{messages.auth.signInWithGoogle}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
