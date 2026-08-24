import React, { useEffect, useRef, useState } from 'react';
import SearchInput from '../common/SearchInput';
import NotificationCenter from './NotificationCenter';

export interface TopbarProps {
  onMobileMenuToggle?: () => void;
  onSearch?: (query: string) => void;
  onNotificationClick?: () => void;
  onHelpClick?: () => void;
  onPlansClick?: () => void;
  onProfileClick?: () => void;
  onBillingClick?: () => void;
  onLogoutClick?: () => void;
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
  avatarUrl?: string | null;
  activePlanName?: string;
  activeTab?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onMobileMenuToggle,
  onSearch,
  onNotificationClick,
  onHelpClick,
  onPlansClick,
  onProfileClick,
  onBillingClick,
  onLogoutClick,
  isLoggedIn = false,
  onLoginClick,
  avatarUrl,
  activePlanName,
  activeTab = 'Workspace',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleMenuItemClick = (callback?: () => void) => {
    setIsMenuOpen(false);
    if (callback) callback();
  };

  return (
    <header className="h-topbar-height bg-background/95 border-b border-outline-variant px-4 md:px-6 flex items-center justify-between shrink-0 relative z-30 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden text-secondary hover:text-on-surface hover:bg-surface-container p-2 rounded-2xl cursor-pointer transition-colors active:opacity-80"
        >
          <span className="material-symbols-outlined select-none">menu</span>
        </button>

        <div className="hidden md:flex items-center gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-secondary flex items-center gap-1">Workspace <span className="material-symbols-outlined text-[13px]">chevron_right</span></p>
            <p className="font-semibold text-on-surface truncate">{activeTab}</p>
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-1 mx-8 max-w-xl">
        {onSearch && <SearchInput onSearchChange={onSearch} placeholder="Search files, folders, or ask AI..." />}
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onHelpClick}
          className="text-secondary hover:text-on-surface hover:bg-surface p-2.5 rounded-xl transition-colors cursor-pointer select-none"
        >
          <span className="material-symbols-outlined select-none">help</span>
        </button>

        {isLoggedIn && <NotificationCenter onOpenFriends={onNotificationClick} />}

        <button
          onClick={onPlansClick}
          className="hidden lg:inline-flex items-center gap-2 rounded-xl border border-[#efc49e] bg-[#ffe0bd] px-4 py-2 text-[#70401f] font-semibold transition-all hover:bg-[#ffd5a5]"
        >
          <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
          Plans
        </button>

        {isLoggedIn ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-2.5 py-1.5 hover:border-primary/40 transition-all shadow-[0_2px_10px_rgba(35,48,38,0.04)]"
            >
              {activePlanName && (
                <span className="hidden sm:inline-flex items-center rounded-full border border-primary/15 bg-primary-fixed/30 px-2 py-1 text-[11px] font-semibold text-primary">
                  {activePlanName}
                </span>
              )}
              <div className="w-9 h-9 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center text-secondary">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[20px] select-none">person</span>
                )}
              </div>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-outline-variant rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 py-2">
                <button
                  type="button"
                  onClick={() => handleMenuItemClick(onProfileClick)}
                  className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] align-middle">person</span>
                  <span className="ml-2">Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuItemClick(onBillingClick)}
                  className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] align-middle">receipt_long</span>
                  <span className="ml-2">Billing</span>
                </button>
                <div className="my-1 border-t border-outline-variant/50" />
                <button
                  type="button"
                  onClick={() => handleMenuItemClick(onLogoutClick)}
                  className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error-container/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] align-middle">logout</span>
                  <span className="ml-2">Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="rounded-3xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition-all hover:opacity-95"
          >
            Log In
          </button>
        )}
      </div>
    </header>
  );
};
export default Topbar;
