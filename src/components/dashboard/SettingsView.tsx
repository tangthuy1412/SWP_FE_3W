/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react';
import { userService } from '../../services/userService';
import type { Theme, UpdateUserSettingsRequest, UserSettingsResponse, Visibility } from '../../services/userService';
import { applyTheme } from '../../lib/themeHelpers';

const THEME_OPTIONS: Theme[] = ['LIGHT', 'DARK', 'SYSTEM'];
const VISIBILITY_OPTIONS: Visibility[] = ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE'];

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, disabled, onChange }) => (
  <div className="flex items-center justify-between gap-6 py-3">
    <div>
      <p className="font-label-md text-body-md font-semibold text-on-surface">{label}</p>
      <p className="text-body-md text-secondary text-sm">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-primary' : 'bg-surface-variant'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<UserSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    setLoadError(null);
    const response = await userService.getMySettings();
    if (response.data && response.data.success) {
      setSettings(response.data.data);
      applyTheme(response.data.data.theme);
    } else {
      setLoadError(response.error || 'Server error');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = async <K extends keyof UpdateUserSettingsRequest>(field: K, value: UpdateUserSettingsRequest[K]) => {
    if (!settings) return;

    const previous = settings;
    // Optimistic update so toggles/selects feel instant
    setSettings({ ...settings, [field]: value } as UserSettingsResponse);
    if (field === 'theme') applyTheme(value as Theme);
    setSaveStatus(null);
    setIsSaving(true);

    const patch: UpdateUserSettingsRequest = { [field]: value } as UpdateUserSettingsRequest;
    const response = await userService.updateMySettings(patch);

    if (response.data && response.data.success) {
      setSettings(response.data.data);
      applyTheme(response.data.data.theme);
      setSaveStatus({ type: 'success', message: 'Settings saved.' });
    } else {
      setSettings(previous);
      applyTheme(previous.theme);
      setSaveStatus({ type: 'error', message: response.error || 'Failed to save settings.' });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-secondary">
        <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="max-w-2xl">
        <div className="p-4 bg-error-container text-error rounded-xl border border-error/20 text-sm flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
          <div className="space-y-2">
            <p>Failed to load settings: {loadError || 'Server error'}</p>
            <button type="button" onClick={loadSettings} className="font-bold hover:underline cursor-pointer">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-lg text-headline-lg font-black text-on-surface">Settings</h1>
        {isSaving && (
          <span className="flex items-center gap-1.5 text-secondary text-sm">
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            Saving...
          </span>
        )}
      </div>

      {saveStatus && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-2.5 ${
            saveStatus.type === 'success'
              ? 'bg-primary-fixed/10 text-primary border-primary/20'
              : 'bg-error-container text-error border-error/20'
          }`}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">
            {saveStatus.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{saveStatus.message}</span>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 space-y-4">
        <h2 className="font-title-lg text-title-lg font-bold text-on-surface">Appearance</h2>

        <div className="space-y-1.5">
          <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Theme</label>
          <select
            value={settings.theme}
            disabled={isSaving}
            onChange={(e) => updateField('theme', e.target.value as Theme)}
            className="w-full h-11 px-4 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
          >
            {THEME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 space-y-4">
        <h2 className="font-title-lg text-title-lg font-bold text-on-surface">Privacy</h2>

        <div className="space-y-1.5">
          <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Profile visibility</label>
          <select
            value={settings.profileVisibility}
            disabled={isSaving}
            onChange={(e) => updateField('profileVisibility', e.target.value as Visibility)}
            className="w-full h-11 px-4 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className="divide-y divide-outline-variant/40">
          <ToggleRow
            label="Allow friend requests"
            description="Let other users send you friend requests."
            checked={settings.allowFriendRequests}
            disabled={isSaving}
            onChange={(value) => updateField('allowFriendRequests', value)}
          />
          <ToggleRow
            label="Show online status"
            description="Let other users see when you're online."
            checked={settings.showOnlineStatus}
            disabled={isSaving}
            onChange={(value) => updateField('showOnlineStatus', value)}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
