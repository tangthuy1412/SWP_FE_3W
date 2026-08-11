import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { saveKnownUser } from '../lib/userHelpers';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage(decodeURIComponent(errorParam));
      // Remove query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const response = await authService.login(email.trim(), password);

    if (response.data && response.data.success) {
      const data = response.data.data;
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('userId', String(data.userId));
      localStorage.setItem('userRole', data.role || 'USER');
      const fullName = data.fullName || data.email.split('@')[0];
      localStorage.setItem('userFullName', fullName);
      saveKnownUser(data.userId, fullName, data.email);
      navigate('/dashboard');
    } else {
      setErrorMessage(response.error || 'Invalid email or password.');
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = () => {
    window.location.href = authService.getGoogleLoginUrl();
  };

  // Shortcut for testing the frontend offline
  const handleDemoBypass = () => {
    localStorage.setItem('token', 'demo-bypass-token-12345');
    localStorage.setItem('refreshToken', 'demo-bypass-refresh-token-12345');
    localStorage.setItem('userEmail', 'demo@example.com');
    localStorage.setItem('userId', '1');
    localStorage.setItem('userRole', 'ADMIN'); // Bypass login as Admin for testing
    localStorage.setItem('userFullName', 'Demo User');
    saveKnownUser(1, 'Demo User', 'demo@example.com');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_15%_15%,rgba(220,239,200,.8),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(255,224,189,.65),transparent_25%),var(--color-background)] flex items-center justify-center p-6 font-body-md text-on-background select-none">
      {/* Centered Auth Card */}
      <div className="w-full max-w-md bg-surface/95 backdrop-blur border border-outline-variant/70 rounded-3xl shadow-[0_30px_80px_rgba(35,48,38,.10)] p-8 space-y-6 animate-in fade-in duration-300">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center text-on-primary shadow-sm mb-2">
            <span className="material-symbols-outlined icon-fill select-none text-[28px]">cloud_sync</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-black text-on-surface tracking-tight">
            Aether<span className="text-tertiary">.</span>
          </h1>
          <p className="font-body-md text-secondary select-none">
            Sign in to access your intelligent file storage
          </p>
        </div>

        {/* Error Message Box */}
        {errorMessage && (
          <div className="p-4 bg-error-container text-error rounded-xl border border-error/20 font-body-md text-sm animate-fade-in flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[20px] select-none shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-label-md text-on-surface-variant text-xs font-semibold block">
              Email Address
            </label>
            <div className="relative focus-within:shadow-sm transition-shadow rounded-xl">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary select-none text-[20px]">
                mail
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full h-12 pl-10 pr-4 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-secondary-fixed-dim focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-label-md text-on-surface-variant text-xs font-semibold block">
                Password
              </label>
              <Link to="/forgot-password" className="font-label-md text-primary text-xs hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative focus-within:shadow-sm transition-shadow rounded-xl">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary select-none text-[20px]">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full h-12 pl-10 pr-12 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-secondary-fixed-dim focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
              {/* Eye toggle button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] select-none">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-6 font-semibold"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full h-12 bg-white border border-outline-variant hover:bg-surface-container-low text-on-surface font-label-md text-label-md rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm cursor-pointer font-semibold"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-outline-variant/40" />
          <span className="flex-shrink mx-4 text-secondary text-xs font-mono-label">OR</span>
          <div className="flex-grow border-t border-outline-variant/40" />
        </div>

        {/* Demo Bypass button for easy testing */}
        <button
          onClick={handleDemoBypass}
          className="w-full h-12 border border-primary text-primary font-label-md text-label-md rounded-xl flex items-center justify-center gap-2 hover:bg-primary/5 active:scale-[0.98] transition-all shadow-sm cursor-pointer font-semibold"
        >
          <span className="material-symbols-outlined text-[20px] select-none">verified_user</span>
          Demo Login (Bypass API)
        </button>

        <p className="text-center font-body-md text-xs text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Create account
          </Link>
        </p>

      </div>
    </div>
  );
};

export default LoginPage;
