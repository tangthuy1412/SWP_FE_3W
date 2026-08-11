/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { userService } from '../services/userService';
import type { UserProfileResponse } from '../services/userService';
import { useUserProfile } from '../contexts/UserProfileContext';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');
  const { setAvatarUrl } = useUserProfile();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [dragging, setDragging] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    setLoadError(null);
    const response = await userService.getMyProfile();
    if (response.data && response.data.success) {
      const data = response.data.data;
      setProfile(data);
      setFullName(data.fullName);
      setBio(data.bio || '');
      setAvatarUrl(data.avatarUrl);
    } else {
      setLoadError(response.error || 'Server error');
    }
    setIsLoadingProfile(false);
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate(`/login?error=${encodeURIComponent('Please log in to view your profile.')}`);
      return;
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setIsSavingProfile(true);
    const response = await userService.updateMyProfile({ fullName: fullName.trim(), bio });
    if (response.data && response.data.success) {
      setProfile(response.data.data);
      alert('Profile updated successfully.');
    } else {
      setProfileError(response.error || 'Failed to update profile.');
    }
    setIsSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsSavingPassword(true);
    const response = await userService.changePassword({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });
    if (response.data && response.data.success) {
      alert('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsChangingPassword(false);
    } else {
      setPasswordError(response.error || 'Failed to change password.');
    }
    setIsSavingPassword(false);
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError(null);
  };

  const handleAvatarFile = async (file: File) => {
    setIsUploadingAvatar(true);
    const response = await userService.uploadAvatar(file);
    if (response.data && response.data.success) {
      setProfile(response.data.data);
      setAvatarUrl(response.data.data.avatarUrl);
    } else {
      const status = response.status;
      if (status === 400 || status === 413) {
        alert(response.error || 'Invalid image file.');
      } else {
        alert('Upload failed, please try again.');
      }
    }
    setIsUploadingAvatar(false);
  };

  const handleAvatarInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAvatarFile(file);
    e.target.value = '';
  };

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleAvatarFile(file);
  };

  if (isLoadingProfile) {
    return (
      <DashboardLayout activeTab="Profile">
        <div className="flex items-center justify-center py-24 text-secondary">
          <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        </div>
      </DashboardLayout>
    );
  }

  if (loadError || !profile) {
    return (
      <DashboardLayout activeTab="Profile">
        <div className="max-w-3xl">
          <div className="p-4 bg-error-container text-error rounded-xl border border-error/20 text-sm flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
            <div className="space-y-2">
              <p>Failed to load profile: {loadError || 'Server error'}</p>
              <button
                type="button"
                onClick={loadProfile}
                className="font-bold hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab="Profile">
      <div className="max-w-3xl space-y-8">
        <h1 className="font-headline-lg text-headline-lg font-black text-on-surface">My Profile</h1>

        {/* Avatar */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 space-y-4">
          <h2 className="font-title-lg text-title-lg font-bold text-on-surface">Avatar</h2>
          <div className="flex items-center gap-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleAvatarDrop}
              onClick={() => avatarInputRef.current?.click()}
              className={`w-24 h-24 rounded-full overflow-hidden border-2 shrink-0 cursor-pointer flex items-center justify-center bg-surface-container-high transition-all ${
                dragging ? 'border-primary' : 'border-outline-variant/60 hover:border-primary/50'
              }`}
            >
              {isUploadingAvatar ? (
                <span className="material-symbols-outlined animate-spin text-2xl text-secondary">progress_activity</span>
              ) : profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-secondary">person</span>
              )}
            </div>
            <div className="space-y-1.5">
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarInputChange}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="px-4 py-2 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary/5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                Change avatar
              </button>
              <p className="text-body-md text-secondary">PNG, JPG, or WebP.</p>
            </div>
          </div>
        </div>

        {/* Profile info */}
        <form onSubmit={handleSaveProfile} className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 space-y-4">
          <h2 className="font-title-lg text-title-lg font-bold text-on-surface">Profile information</h2>

          {profileError && (
            <div className="p-4 bg-error-container text-error rounded-xl border border-error/20 text-sm flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
              <span>{profileError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              disabled={isSavingProfile}
              className="w-full h-11 px-4 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={isSavingProfile}
              className="w-full px-4 py-3 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 text-body-md">
            <div>
              <p className="text-xs font-semibold text-secondary">Email</p>
              <p className="text-on-surface">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary">Role</p>
              <p className="text-on-surface">{profile.role}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary">Status</p>
              <p className="text-on-surface">{profile.status}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary">Member since</p>
              <p className="text-on-surface">{new Date(profile.createdAt).toLocaleDateString('en-US')}</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="h-11 px-6 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSavingProfile ? 'Saving...' : 'Save changes'}
          </button>
        </form>

        {/* Change password */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-title-lg text-title-lg font-bold text-on-surface">Password</h2>
            {!isChangingPassword && (
              <button
                type="button"
                onClick={() => setIsChangingPassword(true)}
                className="text-primary font-bold text-body-md hover:underline cursor-pointer"
              >
                Change password
              </button>
            )}
          </div>

          {isChangingPassword && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="p-4 bg-error-container text-error rounded-xl border border-error/20 text-sm flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isSavingPassword}
                  className="w-full h-11 px-4 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant text-xs font-semibold block">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSavingPassword}
                  minLength={8}
                  className="w-full h-11 px-4 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Confirm new password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={isSavingPassword}
                  minLength={8}
                  className="w-full h-11 px-4 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-xl text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="h-11 px-6 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingPassword ? 'Saving...' : 'Change password'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPasswordChange}
                  disabled={isSavingPassword}
                  className="h-11 px-6 text-secondary font-bold hover:text-on-surface hover:bg-surface-variant rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
