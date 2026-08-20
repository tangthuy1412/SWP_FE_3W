import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import FileDetailPage from './pages/FileDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyOtpPage from './pages/VerifyOtpPage'
import OAuth2RedirectHandler from './pages/OAuth2RedirectHandler'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import SharedLinkPage from './pages/SharedLinkPage'
import ProfilePage from './pages/ProfilePage'
import OfflineDocumentsPage from './pages/OfflineDocumentsPage'
import { UserProfileProvider } from './contexts/UserProfileContext'
import { offlineDocumentService } from './services/offlineDocumentService'
import AlertToast from './components/common/AlertToast'
import { ConfirmProvider } from './contexts/ConfirmContext'

import PaymentResultPage from './pages/PaymentResultPage'

function ProtectedRoute() {
  return localStorage.getItem('token') ? <Outlet /> : <Navigate to="/login" replace />
}

function App() {
  useEffect(() => {
    const handleOnline = () => {
      if (!localStorage.getItem('token')) return;
      const userId = Number(localStorage.getItem('userId'));
      if (!Number.isFinite(userId) || userId <= 0) return;
      offlineDocumentService.synchronizeOfflineDocuments(userId).catch((error) => {
        console.error('Background offline document sync failed:', error);
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <UserProfileProvider>
      <ConfirmProvider>
        <AlertToast />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />

          <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/approvals" element={<DashboardPage />} />
          {/* Route mở màn hình chi tiết tài liệu, nơi người dùng có thể preview và hỏi AI về đúng tài liệu đó. */}
          <Route path="/document/:id" element={<FileDetailPage />} />
          <Route path="/offline-documents" element={<OfflineDocumentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/payment-result" element={<PaymentResultPage />} />
          </Route>
          <Route path="/share/:token" element={<SharedLinkPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </UserProfileProvider>
  )
}

export default App
