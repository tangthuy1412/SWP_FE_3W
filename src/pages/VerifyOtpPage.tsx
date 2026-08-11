import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';

export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || otp.length !== 6) {
      setErrorMessage('Please enter a valid email and 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await authService.verifyOtp(email.trim(), otp.trim());

    if (response.data && response.data.success) {
      setSuccessMessage('Account activated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } else {
      setErrorMessage(response.error || 'Invalid OTP code. Please try again.');
    }
    setIsLoading(false);
  };

  const handleResendOtp = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email to resend OTP.');
      return;
    }

    setResendLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await authService.resendOtp(email.trim());

    if (response.data && response.data.success) {
      alert('OTP code has been resent to your email.');
    } else {
      setErrorMessage(response.error || 'Failed to resend OTP code.');
    }
    setResendLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-6 font-body-md text-on-background select-none">
      {/* Centered Auth Card */}
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-lg p-8 space-y-6 animate-in fade-in duration-300">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center text-on-primary shadow-sm mb-2">
            <span className="material-symbols-outlined icon-fill select-none text-[28px]">cloud_sync</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-black text-on-surface tracking-tight">
            Verify OTP
          </h1>
          <p className="font-body-md text-secondary select-none">
            An OTP code has been sent to your email address. Please enter the 6-digit code below to active your account.
          </p>
        </div>

        {/* Success Message Box */}
        {successMessage && (
          <div className="p-4 bg-primary-fixed text-on-primary-fixed rounded-xl border border-primary/20 font-body-md text-sm animate-fade-in flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[20px] select-none shrink-0 text-primary">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

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
                disabled={isLoading || emailParam !== ''}
                className="w-full h-12 pl-10 pr-4 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-secondary-fixed-dim focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-75"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-label-md text-on-surface-variant text-xs font-semibold block">
                6-Digit Verification Code
              </label>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading || isLoading}
                className="font-label-md text-primary text-xs hover:underline cursor-pointer disabled:opacity-50"
              >
                {resendLoading ? 'Resending...' : 'Resend Code'}
              </button>
            </div>
            <div className="relative focus-within:shadow-sm transition-shadow rounded-xl">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary select-none text-[20px]">
                sms
              </span>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                disabled={isLoading}
                className="w-full h-12 pl-10 pr-4 tracking-[0.25em] font-mono-label text-center text-lg bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl text-on-surface placeholder:text-secondary-fixed-dim focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-6 font-semibold"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              'Verify Code'
            )}
          </button>
        </form>

        <p className="text-center font-body-md text-xs text-secondary mt-4">
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Back to Log In
          </Link>
        </p>

      </div>
    </div>
  );
};

export default VerifyOtpPage;
