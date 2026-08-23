import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import StorageUsageCard from '../dashboard/StorageUsageCard';
import type { StorageUsage } from '../../features/dashboard/dashboard.mock';
import { documentService } from '../../services/documentService';
import { friendService } from '../../services/friendService';
import { getReadSharedDocIds } from '../../lib/sharedDocReadDb';
import { navigationSections } from '../../constants/navigation';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onUploadClick?: () => void;
  onNewFolderClick?: () => void;
  storage?: StorageUsage;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface SidebarContentProps {
  onClose?: () => void;
  activeTab: string;
  onTabChange?: (tab: string) => void;
  onUploadClick?: () => void;
  onNewFolderClick?: () => void;
  storage?: StorageUsage;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const primaryNav = navigationSections[0].items;

const secondaryNav = navigationSections[1].items.filter((item) => !item.adminOnly && item.name !== 'AI Assistant');

const SidebarContent: React.FC<SidebarContentProps> = ({
  onClose,
  activeTab,
  onTabChange,
  onUploadClick,
  onNewFolderClick,
  storage,
  collapsed = false,
  onCollapsedChange,
}) => {
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole');
  const [sharedBadge, setSharedBadge] = useState(0);
  const [friendsBadge, setFriendsBadge] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    const loadBadges = async () => {
      try {
        const [sharedRes, friendsRes] = await Promise.all([
          documentService.getSharedWithMeDocuments().catch(() => null),
          friendService.getIncomingRequests().catch(() => null),
        ]);
        if (sharedRes?.data?.success && Array.isArray(sharedRes.data.data)) {
          const currentUserId = Number(localStorage.getItem('userId')) || null;
          const readIds = getReadSharedDocIds(currentUserId);
          const unreadCount = sharedRes.data.data.filter((doc) => !readIds.has(doc.documentId)).length;
          setSharedBadge(unreadCount);
        }
        if (friendsRes?.data?.success && Array.isArray(friendsRes.data.data)) {
          setFriendsBadge(friendsRes.data.data.length);
        }
      } catch (e) {
        console.error('Failed to fetch sidebar badges:', e);
      }
    };
    loadBadges();

    window.addEventListener('shared-doc-read-updated', loadBadges);
    return () => {
      window.removeEventListener('shared-doc-read-updated', loadBadges);
    };
  }, []);

  const handleTabClick = (tabName: string) => {
    if (tabName === 'Offline') {
      navigate('/offline-documents');
      if (onClose) onClose();
      return;
    }

    if (onTabChange) {
      // Already on a page that manages tabs locally (e.g. the dashboard) - switch in place.
      onTabChange(tabName);
    } else {
      // No local tab handler (e.g. viewing from /profile) - navigate to the dashboard,
      // which restores the requested tab from location.state on mount.
      navigate('/dashboard', { state: { activeTab: tabName } });
    }
    if (onClose) onClose(); // Close mobile sidebar
  };

  return (
    <div className="flex flex-col h-full py-5 bg-surface text-on-surface overflow-hidden">
      {/* Brand Header */}
      <div className={`${collapsed ? 'px-3' : 'px-5'} mb-6`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm">
            <span className="material-symbols-outlined icon-fill text-[19px]">cloud_sync</span>
          </div>
          {!collapsed && <div className="hidden lg:block min-w-0">
            <h1 className="text-[18px] leading-tight font-bold tracking-[-0.04em] truncate">Docentra<span className="text-tertiary">.</span></h1>
            <p className="text-[11px] text-secondary">Document workspace</p>
          </div>}
          {!collapsed && onCollapsedChange && <button type="button" onClick={() => onCollapsedChange(true)} className="hidden lg:grid ml-auto w-8 h-8 place-items-center rounded-lg text-secondary hover:bg-surface-container" aria-label="Collapse sidebar"><span className="material-symbols-outlined text-[18px]">left_panel_close</span></button>}
        </div>
      </div>

      {/* Primary CTAs */}
      <div className={`${collapsed ? 'px-3 grid-cols-1' : 'px-4 grid-cols-[1fr_42px]'} mb-5 grid gap-2`}>
        <Button
          variant="primary"
          leftIcon="upload_file"
          onClick={onUploadClick}
          className="w-full justify-center py-2.5"
        >
          {!collapsed && <span className="hidden lg:inline">Upload File</span>}
        </Button>
        {!collapsed && <Button
          variant="outline"
          leftIcon="create_new_folder"
          onClick={onNewFolderClick}
          className="hidden lg:flex w-full justify-center !px-0 py-2.5"
        >
          <span className="sr-only">New Folder</span>
        </Button>}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto select-none">
        <div className="space-y-1">
          {primaryNav.map((item) => {
            const isActive = activeTab === item.name;
            const badgeCount = item.name === 'Shared' ? sharedBadge : 0;
            return (
              <button
                key={item.name}
                type="button"
                title={collapsed ? item.name : undefined}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleTabClick(item.name)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-in-out group cursor-pointer ${collapsed ? 'justify-center' : ''} ${
                  isActive
                    ? 'bg-primary-fixed/75 text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] leading-none select-none">
                  {item.icon}
                </span>
                {!collapsed && <span className="hidden lg:inline font-label-md text-label-md flex-1 truncate">{item.name}</span>}
                {!collapsed && badgeCount > 0 && (
                  <span className="bg-error text-on-error font-semibold text-[11px] px-2 py-0.5 rounded-full min-w-[24px] text-center">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="border-t border-outline-variant/70 pt-4 px-1">
          {!collapsed && <div className="hidden lg:block text-[10px] uppercase tracking-[0.16em] text-secondary font-semibold mb-2 px-2">Workspace</div>}
          {role === 'ADMIN' && (
            <>
              {(['AI Assistant', 'Admin', 'Review Approvals'] as const).map((itemName) => {
                const item = navigationSections[1].items.find((entry) => entry.name === itemName);
                if (!item) return null;
                return (
                  <button
                    key={itemName}
                    type="button"
                    title={collapsed ? itemName : undefined}
                    onClick={() => handleTabClick(itemName)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-in-out cursor-pointer ${collapsed ? 'justify-center' : ''} ${
                      activeTab === itemName
                        ? 'bg-primary-fixed/75 text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    {!collapsed && <span className="hidden lg:inline font-label-md text-label-md">{itemName}</span>}
                  </button>
                );
              })}
            </>
          )}
          <div className="mt-1 space-y-1">
            {secondaryNav.map((item) => {
              const isActive = activeTab === item.name;
              const badgeCount = item.name === 'Friends' ? friendsBadge : 0;
              return (
                <button
                  key={item.name}
                  type="button"
                  title={collapsed ? item.name : undefined}
                  onClick={() => handleTabClick(item.name)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-in-out cursor-pointer ${collapsed ? 'justify-center' : ''} ${
                    isActive
                      ? 'bg-primary-fixed/75 text-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {!collapsed && <span className="hidden lg:inline font-label-md text-label-md flex-1 truncate">{item.name}</span>}
                  {!collapsed && badgeCount > 0 && (
                    <span className="bg-error text-on-error font-semibold text-[11px] px-2 py-0.5 rounded-full">{badgeCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer Area */}
      <div className="mt-auto px-3 pt-4">
        {!collapsed && storage && <div className="hidden lg:block"><StorageUsageCard storage={storage} /></div>}
        <button
          type="button"
          title={collapsed ? 'Settings' : undefined}
          onClick={() => handleTabClick('Settings')}
          className={`w-full text-left flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl transition-all duration-200 ease-in-out cursor-pointer ${collapsed ? 'justify-center' : ''} ${
            activeTab === 'Settings'
              ? 'bg-primary-fixed/75 text-primary font-semibold'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          {!collapsed && <span className="hidden lg:inline font-label-md text-label-md">Settings</span>}
        </button>
        {collapsed && onCollapsedChange && <button type="button" onClick={() => onCollapsedChange(false)} className="hidden lg:flex w-full items-center justify-center mt-2 p-2.5 rounded-xl text-secondary hover:bg-surface-container" aria-label="Expand sidebar"><span className="material-symbols-outlined text-[20px]">left_panel_open</span></button>}
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  activeTab = 'My Files',
  onTabChange,
  onUploadClick,
  onNewFolderClick,
  storage,
  collapsed = false,
  onCollapsedChange,
}) => {
  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside className={`w-[76px] ${collapsed ? '' : 'lg:w-sidebar-width'} h-screen fixed left-0 top-0 hidden md:flex flex-col border-r border-outline-variant bg-surface z-40 transition-[width] duration-200`}>
        <SidebarContent
          activeTab={activeTab}
          onTabChange={onTabChange}
          onUploadClick={onUploadClick}
          onNewFolderClick={onNewFolderClick}
          storage={storage}
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
        />
      </aside>

      {/* 2. Mobile Sidebar Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop Overlay */}
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          />
          {/* Sliding Panel */}
          <aside className="absolute left-0 top-0 w-sidebar-width h-full bg-surface-container-low border-r border-outline-variant flex flex-col shadow-xl animate-in slide-in-from-left duration-250">
            <SidebarContent
              onClose={onClose}
              activeTab={activeTab}
              onTabChange={onTabChange}
              onUploadClick={onUploadClick}
              onNewFolderClick={onNewFolderClick}
              storage={storage}
            />
          </aside>
        </div>
      )}
    </>
  );
};
export default Sidebar;
