import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import SubscriptionModal from '../components/dashboard/SubscriptionModal';
import BillingModal from '../components/dashboard/BillingModal';
import { authService } from '../services/authService';
import subscriptionService from '../services/subscriptionService';
import { documentService } from '../services/documentService';
import type { DocumentUploadResponse } from '../services/documentService';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useConfirm } from '../contexts/ConfirmContext';
import type { StorageUsage } from '../features/dashboard/dashboard.mock';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSearch?: (query: string) => void;
  onUploadClick?: () => void;
  onNewFolderClick?: () => void;
  fluid?: boolean;
  storage?: StorageUsage;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab = 'My Files',
  onTabChange,
  onSearch,
  onUploadClick,
  onNewFolderClick,
  fluid = false,
  storage,
}) => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [activePlanName, setActivePlanName] = useState<string>('');
  const [internalStorage, setInternalStorage] = useState<StorageUsage | undefined>(undefined);
  const isLoggedIn = !!localStorage.getItem('token');
  const { avatarUrl } = useUserProfile();
  const confirmAction = useConfirm();

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchDashboardData = async () => {
      try {
        const [subRes, myDocsRes, sharedDocsRes] = await Promise.all([
          subscriptionService.getMySubscription().catch(() => null),
          documentService.getMyDocuments().catch(() => null),
          documentService.getSharedWithMeDocuments().catch(() => null),
        ]);

        let limitGb = 2;
        if (subRes && subRes.data && subRes.data.success && subRes.data.data) {
          setActivePlanName(subRes.data.data.planName || 'FREE');
          limitGb = subRes.data.data.storageLimitGb || 2;
        } else {
          setActivePlanName('FREE');
        }

        let totalUsed = 0;
        if (myDocsRes && myDocsRes.data && myDocsRes.data.success && myDocsRes.data.data) {
          totalUsed += myDocsRes.data.data.reduce((sum: number, f: DocumentUploadResponse) => sum + (f.fileSize || 0), 0);
        }
        if (sharedDocsRes && sharedDocsRes.data && sharedDocsRes.data.success && sharedDocsRes.data.data) {
          totalUsed += sharedDocsRes.data.data.reduce((sum: number, f: DocumentUploadResponse) => sum + (f.fileSize || 0), 0);
        }

        const totalBytes = limitGb * 1024 * 1024 * 1024;
        const usedPercentage = Math.min(100, Math.round((totalUsed / totalBytes) * 100));

        setInternalStorage({
          usedBytes: totalUsed,
          totalBytes,
          usedPercentage,
          formattedUsed: formatBytes(totalUsed),
          formattedTotal: `${limitGb} GB`
        });
      } catch (err) {
        console.error('Error fetching dashboard storage details:', err);
      }
    };

    fetchDashboardData();
  }, [isLoggedIn]);

  const handleMobileMenuToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  };

  const handleLogout = async () => {
    const confirmLogout = await confirmAction({ title: 'Log out?', message: 'Are you sure you want to log out?', confirmLabel: 'Log out' });
    if (!confirmLogout) return;

    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch (err) {
        console.error('Logout error on backend:', err);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex overflow-hidden selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Sidebar Navigation (Static on Desktop, Drawer on Mobile) */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={handleSidebarClose}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onUploadClick={onUploadClick}
        onNewFolderClick={onNewFolderClick}
        storage={storage || internalStorage}
        collapsed={isSidebarCollapsed}
        onCollapsedChange={handleSidebarCollapse}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col md:ml-[76px] ${isSidebarCollapsed ? '' : 'lg:ml-sidebar-width'} h-screen w-full relative overflow-hidden transition-[margin] duration-200`}>
        {/* Top bar header */}
        <Topbar
          onMobileMenuToggle={handleMobileMenuToggle}
          onSearch={onSearch}
          onNotificationClick={() => alert('Notifications clicked!')}
          onHelpClick={() => alert('Help center clicked!')}
          onUpgradeClick={() => setIsSubModalOpen(true)}
          onBillingClick={() => setIsBillingModalOpen(true)}
          isLoggedIn={isLoggedIn}
          onLoginClick={() => navigate('/login')}
          onProfileClick={() => navigate('/profile')}
          onLogoutClick={handleLogout}
          avatarUrl={avatarUrl}
          activePlanName={activePlanName}
          activeTab={activeTab}
        />

        {/* Scrollable Main Canvas */}
        {fluid ? (
          <main className="flex-1 flex overflow-hidden bg-background relative px-2 pb-2">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto px-4 pb-20 md:px-6 md:pb-8">
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
              {children}
            </div>
          </main>
        )}
      </div>

      {/* Subscription Plans Modal */}
      <SubscriptionModal 
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
      />

      {/* Billing History Modal */}
      <BillingModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
      />
    </div>
  );
};
export default DashboardLayout;
