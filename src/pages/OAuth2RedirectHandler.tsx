import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveKnownUser } from '../lib/userHelpers';

export const OAuth2RedirectHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const email = params.get('email');
    const fullName = params.get('fullName');

    if (token && refreshToken) {
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      if (email) {
        localStorage.setItem('userEmail', email);
      }
      const userId = params.get('userId');
      if (userId) {
        localStorage.setItem('userId', userId);
      }
      const role = params.get('role');
      if (role) {
        localStorage.setItem('userRole', role);
      }
      if (fullName) {
        localStorage.setItem('userFullName', fullName);
      }
      if (userId && (fullName || email)) {
        saveKnownUser(userId, fullName || email!.split('@')[0], email);
      }
      
      // Clean query parameters from URL and redirect to dashboard
      navigate('/dashboard', { replace: true });
    } else {
      // If we already have tokens in localStorage, it means this is a React Strict Mode
      // double-render remount where the URL was already cleared in the first execution.
      if (localStorage.getItem('token') && localStorage.getItem('refreshToken')) {
        navigate('/dashboard', { replace: true });
        return;
      }

      console.error('Google OAuth2 callback missing token or refreshToken.');
      alert('Authentication failed: Missing credentials from Google login.');
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 text-center select-none font-body-md">
      <div className="space-y-4 animate-pulse">
        {/* Loading Spinner */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
        </div>
        <div>
          <h2 className="font-title-lg text-title-lg font-bold text-on-surface">Signing in with Google</h2>
          <p className="text-secondary text-sm mt-1">Please wait while we set up your secure session...</p>
        </div>
      </div>
    </div>
  );
};

export default OAuth2RedirectHandler;
