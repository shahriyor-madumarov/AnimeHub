import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    signIn,
    signUp,
    isConfigured,
  } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailConfirmNotice, setShowEmailConfirmNotice] = useState(false);

  // Reset form when modal opens or mode changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setErrorMessage(null);
      setShowEmailConfirmNotice(false);
      setPassword('');
      setConfirmPassword('');
    }
  }, [isAuthModalOpen, authModalMode]);

  if (!isAuthModalOpen) {
    return null;
  }

  const mapSupabaseError = (err: any): string => {
    if (!err) return t('authUnknownError');
    const msg = String(err.message || err).toLowerCase();

    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return t('authInvalidCredentials');
    }
    if (msg.includes('email not confirmed')) {
      return t('authCheckEmailNotice');
    }
    if (msg.includes('already registered') || msg.includes('user already exists')) {
      return t('authEmailAlreadyRegistered');
    }
    if (msg.includes('at least 6 characters') || msg.includes('weak password')) {
      return t('authWeakPassword');
    }
    if (msg.includes('fetch') || msg.includes('network')) {
      return t('authNetworkError');
    }
    if (msg.includes('supabase_not_configured')) {
      return t('authNotConfiguredDesc');
    }
    return err.message || t('authUnknownError');
  };

  const handleModeSwitch = (mode: 'login' | 'register') => {
    setErrorMessage(null);
    setShowEmailConfirmNotice(false);
    setAuthModalMode(mode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic client validations
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage(t('authEmailRequired'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage(t('authInvalidEmail'));
      return;
    }
    if (!password) {
      setErrorMessage(t('authPasswordRequired'));
      return;
    }
    if (password.length < 6) {
      setErrorMessage(t('authWeakPassword'));
      return;
    }

    if (authModalMode === 'register') {
      if (password !== confirmPassword) {
        setErrorMessage(t('authPasswordsDoNotMatch'));
        return;
      }

      setIsSubmitting(true);
      const res = await signUp(cleanEmail, password, displayName);
      setIsSubmitting(false);

      if (res.error) {
        setErrorMessage(mapSupabaseError(res.error));
        return;
      }

      if (res.requiresEmailConfirmation) {
        setShowEmailConfirmNotice(true);
      } else {
        closeAuthModal();
      }
    } else {
      // Login
      setIsSubmitting(true);
      const res = await signIn(cleanEmail, password);
      setIsSubmitting(false);

      if (res.error) {
        setErrorMessage(mapSupabaseError(res.error));
        return;
      }

      closeAuthModal();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Click outside to close backdrop */}
      <div
        className="fixed inset-0"
        onClick={closeAuthModal}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md bg-[#11131f] border border-white/10 rounded-2xl shadow-2xl p-4 min-[360px]:p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          id="auth-modal-close-btn"
          type="button"
          onClick={closeAuthModal}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-600/30 mb-2.5">
            {authModalMode === 'login' ? (
              <LogIn className="w-5 h-5" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
          </div>
          <h2
            id="auth-modal-title"
            className="text-lg min-[360px]:text-xl font-bold text-white tracking-tight font-display"
          >
            {authModalMode === 'login' ? t('authSignIn') : t('authSignUp')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {authModalMode === 'login'
              ? 'AnimeHub Discovery Platform'
              : 'Join the AnimeHub Community'}
          </p>
        </div>

        {/* Supabase Configuration Warning (if not yet configured in env) */}
        {!isConfigured && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('authNotConfiguredTitle')}</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                {t('authNotConfiguredDesc')}
              </p>
            </div>
          </div>
        )}

        {/* Email Confirmation Required Notice */}
        {showEmailConfirmNotice ? (
          <div className="py-3 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Mail className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-white">
                {t('authCheckEmail')}
              </h3>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                {t('authCheckEmailNotice')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors border border-white/10"
            >
              {t('authSignIn')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {/* Error Banner */}
            {errorMessage && (
              <div
                className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span className="flex-1 text-[11px] min-[360px]:text-xs leading-snug">
                  {errorMessage}
                </span>
              </div>
            )}

            {/* Display Name (Register only) */}
            {authModalMode === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {t('authDisplayName')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-display-name-input"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('authDisplayNamePlaceholder')}
                    maxLength={40}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#0a0c14] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {t('authEmail')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('authEmailPlaceholder')}
                  required
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#0a0c14] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {t('authPassword')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('authPasswordPlaceholder')}
                  required
                  autoComplete={authModalMode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-9 pr-9 py-2 text-xs bg-[#0a0c14] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {authModalMode === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {t('authConfirmPassword')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('authConfirmPasswordPlaceholder')}
                    required
                    autoComplete="new-password"
                    className="w-full pl-9 pr-9 py-2 text-xs bg-[#0a0c14] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                authModalMode === 'login' ? t('authLoggingIn') : t('authRegistering')
              ) : (
                <>
                  <span>{authModalMode === 'login' ? t('authSignIn') : t('authSignUp')}</span>
                </>
              )}
            </button>

            {/* Mode Toggle Footer */}
            <div className="pt-2 text-center border-t border-white/5">
              {authModalMode === 'login' ? (
                <p className="text-xs text-slate-400">
                  {t('authDontHaveAccount')}{' '}
                  <button
                    id="auth-switch-to-register-btn"
                    type="button"
                    onClick={() => handleModeSwitch('register')}
                    className="text-rose-400 hover:text-rose-300 font-semibold transition-colors underline-offset-2 hover:underline ml-1"
                  >
                    {t('authRegister')}
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  {t('authAlreadyHaveAccount')}{' '}
                  <button
                    id="auth-switch-to-login-btn"
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className="text-rose-400 hover:text-rose-300 font-semibold transition-colors underline-offset-2 hover:underline ml-1"
                  >
                    {t('authSignIn')}
                  </button>
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
