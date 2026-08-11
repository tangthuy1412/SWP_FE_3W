import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await authService.forgotPassword(email.trim());

    if (response.data && response.data.success) {
      setSuccessMessage('Verification OTP sent successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        setStep(2);
      }, 1000);
    } else {
      setErrorMessage(response.error || 'Failed to send OTP. Please check your email.');
    }
    setIsLoading(false);
  };

  // Resend OTP in Step 2
  const handleResendOtp = async () => {
    setResendLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await authService.forgotPassword(email.trim());

    if (response.data && response.data.success) {
      setSuccessMessage('OTP code has been resent to your email.');
    } else {
      setErrorMessage(response.error || 'Failed to resend OTP code.');
    }
    setResendLoading(false);
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMessage('Please enter a 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await authService.verifyForgotPasswordOtp(email.trim(), otp.trim());

    if (response.data && response.data.success) {
      setSuccessMessage('OTP verified successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        setStep(3);
      }, 1000);
    } else {
      setErrorMessage(response.error || 'Invalid OTP code. Please check and try again.');
    }
    setIsLoading(false);
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await authService.resetPassword(email.trim(), newPassword);

    if (response.data && response.data.success) {
      setSuccessMessage('Password reset successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        setStep(4);
      }, 1000);
    } else {
      setErrorMessage(response.error || 'Failed to reset password. Please try again.');
    }
    setIsLoading(false);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center text-on-primary shadow-sm mb-2">
                <span className="material-symbols-outlined icon-fill select-none text-[28px]">lock_reset</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg font-black text-on-surface tracking-tight">
                Forgot Password
              </h1>
              <p className="font-body-md text-secondary select-none">
                Enter your email address and we'll send you a 6-digit OTP code to verify your identity.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 bg-error-container text-error rounded-xl border border-error/20 font-body-md text-sm animate-fade-in flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] select-none shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-4 bg-primary-fixed text-on-primary-fixed rounded-xl border border-primary/20 font-body-md text-sm animate-fade-in flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] select-none shrink-0 text-primary">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleRequestOtp} className="space-y-4">
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
                  'Send OTP Code'
                )}
              </button>
            </form>

            <p className="text-center font-body-md text-xs text-secondary mt-4">
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Back to Log In
              </Link>
            </p>
          </>
        );

      case 2:
        return (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center text-on-primary shadow-sm mb-2">
                <span className="material-symbols-outlined icon-fill select-none text-[28px]">sms</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg font-black text-on-surface tracking-tight">
                Verify OTP
              </h1>
              <p className="font-body-md text-secondary select-none">
                Please enter the 6-digit verification code sent to <strong className="text-on-surface font-semibold">{email}</strong>.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 bg-error-container text-error rounded-xl border border-error/20 font-body-md text-sm animate-fade-in flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] select-none shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-4 bg-primary-fixed text-on-primary-fixed rounded-xl border border-primary/20 font-body-md text-sm animate-fade-in flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] select-none shrink-0 text-primary">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-label-md text-on-surface-variant text-xs font-semibold block">
                    Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading || isLoading}
                    className="font-label-md text-primary text-xs hover:underline cursor-pointer disabled:opacity-50 font-semibold"
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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="flex-1 h-12 border border-outline-variant hover:bg-surface-container-high text-secondary font-semibold font-label-md text-label-md rounded-xl active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="flex-1 h-12 bg-primary text-on-primary font-semibold font-label-md text-label-md rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
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
              </div>
            </form>
          </>
        );

      case 3:
        return (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center text-on-primary shadow-sm mb-2">
                <span className="material-symbols-outlined icon-fill select-none text-[28px]">lock</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg font-black text-on-surface tracking-tight">
                Reset Password
              </h1>
              <p className="font-body-md text-secondary select-none">
                Set a strong password for your account (minimum 8 characters).
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 bg-error-container text-error rounded-xl border border-error/20 font-body-md text-sm animate-fade-in flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] select-none shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-4 bg-primary-fixed text-on-primary-fixed rounded-xl border border-primary/20 font-body-md text-sm animate-fade-in flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] select-none shrink-0 text-primary">check_circle</span>
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant text-xs font-semibold block">
                  New Password
                </label>
                <div className="relative focus-within:shadow-sm transition-shadow rounded-xl">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary select-none text-[20px]">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-12 pl-10 pr-12 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-secondary-fixed-dim focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    required
                  />
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

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant text-xs font-semibold block">
                  Confirm New Password
                </label>
                <div className="relative focus-within:shadow-sm transition-shadow rounded-xl">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary select-none text-[20px]">
                    lock
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-12 pl-10 pr-12 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl font-body-md text-body-md text-on-surface placeholder:text-secondary-fixed-dim focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-on-surface transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] select-none">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
                className="w-full h-12 bg-primary text-on-primary font-semibold font-label-md text-label-md rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-6"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </>
        );

      case 4:
        return (
          <>
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex w-16 h-16 rounded-full bg-primary-fixed items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-[36px] font-bold">check_circle</span>
              </div>
              <div className="space-y-2">
                <h1 className="font-headline-lg text-headline-lg font-black text-on-surface tracking-tight">
                  All Set!
                </h1>
                <p className="font-body-md text-secondary select-none">
                  Your password has been successfully reset. You can now log in using your new credentials.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-primary text-on-primary font-semibold font-label-md text-label-md rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm cursor-pointer mt-6"
            >
              Back to Log In
            </button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-6 font-body-md text-on-background select-none">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-lg p-8 space-y-6 animate-in fade-in duration-300">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
