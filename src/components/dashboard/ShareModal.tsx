import React, { useState, useEffect } from 'react';
import { documentService } from '../../services/documentService';
import { friendService } from '../../services/friendService';
import type { FriendResponse } from '../../services/friendService';
import { useConfirm } from '../../contexts/ConfirmContext';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  documentName: string;
  isInitiallyPublic: boolean;
  onVisibilityChange?: (isPublic: boolean) => void;
}

interface ExistingShare {
  userId: number;
  email: string;
  fullName: string;
  createdAt?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentName,
  isInitiallyPublic,
  onVisibilityChange,
}) => {
  const confirmAction = useConfirm();
  const [activeTab, setActiveTab] = useState<'link' | 'friends'>('link');
  const [friends, setFriends] = useState<FriendResponse[]>([]);
  const [isLinkSharingEnabled, setIsLinkSharingEnabled] = useState(isInitiallyPublic);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Direct sharing states
  const [friendSearch, setFriendSearch] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isSharingDirect, setIsSharingDirect] = useState(false);
  const [directShareStatus, setDirectShareStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Track shares fetched from backend
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  const fetchOrCreateShareLink = React.useCallback(async () => {
    setIsLoadingLink(true);
    try {
      const response = await documentService.createShareLink(documentId);
      if (response.data && response.data.success) {
        setShareToken(response.data.data.token);
      }
    } catch (e) {
      console.error('Failed to create/retrieve share link:', e);
    } finally {
      setIsLoadingLink(false);
    }
  }, [documentId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setIsLinkSharingEnabled(isInitiallyPublic);
      setShareToken(null);
      setCopySuccess(false);
      setFriendSearch('');
      setCustomEmail('');
      setDirectShareStatus(null);
      setExistingShares([]);
      
      // Load friends list and existing shares for direct sharing
      const loadInitialData = async () => {
        setIsLoadingShares(true);
        try {
          const [friendsRes, sharesRes] = await Promise.all([
            friendService.getFriends().catch(() => null),
            documentService.getDocumentShares(documentId).catch(() => null),
          ]);

          if (friendsRes?.data && friendsRes.data.success) {
            setFriends(friendsRes.data.data);
          }

          if (sharesRes?.data && sharesRes.data.success) {
            setExistingShares(
              sharesRes.data.data.map((s) => ({
                userId: s.sharedWithUserId,
                email: s.sharedWithEmail,
                fullName: s.sharedWithName,
                createdAt: s.createdAt,
              }))
            );
          }
        } catch (e) {
          console.error('Failed to load modal data:', e);
        } finally {
          setIsLoadingShares(false);
        }
      };
      loadInitialData();

      // If initially public, we can call createShareLink or wait. Let's fetch the link if enabled.
      if (isInitiallyPublic) {
        fetchOrCreateShareLink();
      }
    }
  }, [isOpen, documentId, isInitiallyPublic, fetchOrCreateShareLink]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen) return null;

  const handleLinkToggle = async () => {
    setIsLoadingLink(true);
    setCopySuccess(false);
    const newStatus = !isLinkSharingEnabled;
    try {
      if (newStatus) {
        const response = await documentService.createShareLink(documentId);
        if (response.data && response.data.success) {
          setShareToken(response.data.data.token);
          setIsLinkSharingEnabled(true);
          if (onVisibilityChange) onVisibilityChange(true);
        } else {
          alert('Failed to enable link sharing: ' + (response.error || 'Server error'));
        }
      } else {
        const response = await documentService.disableShareLink(documentId);
        if (response.data && response.data.success) {
          setShareToken(null);
          setIsLinkSharingEnabled(false);
          if (onVisibilityChange) onVisibilityChange(false);
        } else {
          alert('Failed to disable link sharing: ' + (response.error || 'Server error'));
        }
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while updating link sharing status.');
    } finally {
      setIsLoadingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareToken) return;
    const shareUrl = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleDirectShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = customEmail.trim();
    if (!targetEmail) return;

    const confirmed = await confirmAction({
      title: 'Share Document?',
      message: `Are you sure you want to share "${documentName}" with ${targetEmail}?`,
      confirmLabel: 'Share',
      variant: 'primary',
    });
    if (!confirmed) return;

    setIsSharingDirect(true);
    setDirectShareStatus(null);
    try {
      const response = await documentService.shareDocumentWithUser(documentId, targetEmail);
      if (response.data && response.data.success) {
        const shareData = response.data.data;
        setDirectShareStatus({
          type: 'success',
          message: `Shared successfully with ${targetEmail}!`,
        });
        setCustomEmail('');
        
        // Add or update in existing shares
        setExistingShares((prev) => [
          {
            userId: shareData.sharedWithUserId,
            email: shareData.sharedWithEmail,
            fullName: shareData.sharedWithName,
            createdAt: shareData.createdAt || new Date().toISOString(),
          },
          ...prev.filter((s) => s.userId !== shareData.sharedWithUserId),
        ]);
      } else {
        setDirectShareStatus({
          type: 'error',
          message: response.error || 'Failed to share document. Check if the user is a friend.',
        });
      }
    } catch {
      setDirectShareStatus({
        type: 'error',
        message: 'An error occurred while sharing the document.',
      });
    } finally {
      setIsSharingDirect(false);
    }
  };

  const handleShareWithFriend = async (friend: FriendResponse) => {
    const confirmed = await confirmAction({
      title: 'Share Document?',
      message: `Are you sure you want to share "${documentName}" with ${friend.fullName} (${friend.email})?`,
      confirmLabel: 'Share',
      variant: 'primary',
    });
    if (!confirmed) return;

    setIsSharingDirect(true);
    setDirectShareStatus(null);
    try {
      const response = await documentService.shareDocumentWithUser(documentId, friend.email);
      if (response.data && response.data.success) {
        const shareData = response.data.data;
        setDirectShareStatus({
          type: 'success',
          message: `Shared successfully with ${friend.fullName}!`,
        });
        
        // Add to existing shares
        setExistingShares((prev) => [
          {
            userId: friend.userId,
            email: friend.email,
            fullName: friend.fullName,
            createdAt: shareData?.createdAt || new Date().toISOString(),
          },
          ...prev.filter((s) => s.userId !== friend.userId),
        ]);
      } else {
        setDirectShareStatus({
          type: 'error',
          message: response.error || 'Failed to share document.',
        });
      }
    } catch {
      setDirectShareStatus({
        type: 'error',
        message: 'An error occurred while sharing the document.',
      });
    } finally {
      setIsSharingDirect(false);
    }
  };

  // Filter friends list based on search and whether they are already in existingShares
  const filteredFriends = friends.filter(
    (friend) =>
      (friend.fullName.toLowerCase().includes(friendSearch.toLowerCase()) ||
        friend.email.toLowerCase().includes(friendSearch.toLowerCase())) &&
      !existingShares.some((s) => s.userId === friend.userId)
  );

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : '';

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-surface rounded-2xl border border-surface-variant max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-variant flex items-center justify-between select-none">
          <div>
            <h3 className="font-title-lg text-title-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">share</span>
              Share Document
            </h3>
            <p className="text-secondary text-xs truncate max-w-[320px] mt-0.5" title={documentName}>
              {documentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="material-symbols-outlined text-secondary hover:text-on-surface hover:bg-surface-variant p-1 rounded-full cursor-pointer transition-colors"
          >
            close
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-surface-variant px-6 bg-surface-container-lowest select-none">
          <button
            onClick={() => setActiveTab('link')}
            className={`py-3 px-4 text-label-md font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'link'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">link</span>
            Public Share Link
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`py-3 px-4 text-label-md font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'friends'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            Direct Friend Share
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[350px] min-h-[220px]">
          
          {/* TAB 1: PUBLIC LINK SHARING */}
          {activeTab === 'link' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-surface-container rounded-xl p-4 border border-surface-variant/40">
                <div className="mr-4">
                  <h4 className="font-label-md text-label-md font-bold text-on-surface select-none">
                    Link Sharing
                  </h4>
                  <p className="text-secondary text-body-sm mt-0.5 select-none">
                    Anyone with this link can view and download this file.
                  </p>
                </div>
                
                {/* Switch Toggle */}
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isLinkSharingEnabled}
                    onChange={handleLinkToggle}
                    disabled={isLoadingLink}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high border border-outline peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-secondary after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-on-primary peer-checked:after:border-transparent"></div>
                </label>
              </div>

              {isLinkSharingEnabled && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1">
                    <span className="font-label-md text-label-md text-secondary select-none">
                      Shared Link
                    </span>
                    <div className="flex rounded-lg border border-surface-variant bg-surface-container-high overflow-hidden transition-all">
                      <input
                        type="text"
                        readOnly
                        value={isLoadingLink ? 'Generating link...' : shareUrl}
                        className="flex-1 h-11 bg-transparent px-4 text-body-md focus:outline-none font-mono text-xs select-all text-secondary"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        disabled={isLoadingLink || !shareToken}
                        className="bg-primary/10 text-primary hover:bg-primary/20 px-5 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {copySuccess ? 'check' : 'content_copy'}
                        </span>
                        {copySuccess ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {isLoadingLink && (
                <div className="flex items-center gap-2 text-xs text-secondary justify-center py-2 select-none">
                  <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Updating sharing permissions...</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SHARE WITH FRIENDS */}
          {activeTab === 'friends' && (
            <div className="space-y-4">
              
              {/* Direct email share input */}
              <form onSubmit={handleDirectShareSubmit} className="flex gap-2">
                <div className="flex-1 flex rounded-lg border border-surface-variant bg-surface focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary overflow-hidden transition-all h-10.5">
                  <input
                    type="email"
                    placeholder="Enter friend's email address..."
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    disabled={isSharingDirect}
                    className="flex-1 bg-transparent px-4 text-body-md focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSharingDirect || !customEmail.trim()}
                  className="bg-primary text-on-primary hover:bg-primary/90 px-4 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 disabled:pointer-events-none"
                >
                  Share
                </button>
              </form>

              {directShareStatus && (
                <div
                  className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs select-none animate-in fade-in ${
                    directShareStatus.type === 'success'
                      ? 'bg-success-container/20 border-success/30 text-success'
                      : 'bg-error-container/20 border-error/30 text-error'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {directShareStatus.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span>{directShareStatus.message}</span>
                </div>
              )}

              {/* Friends lists autocomplete select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between select-none">
                  <span className="font-label-md text-label-md text-secondary">
                    Select Friends
                  </span>
                  {friends.length > 0 && (
                    <input
                      type="text"
                      placeholder="Search friends..."
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      className="text-xs border-b border-surface-variant bg-transparent focus:outline-none focus:border-primary px-1 py-0.5 max-w-[150px]"
                    />
                  )}
                </div>

                <div className="border border-surface-variant/60 rounded-xl overflow-hidden max-h-[140px] overflow-y-auto bg-surface-container-lowest">
                  {filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => (
                      <div
                        key={friend.friendshipId}
                        className="flex items-center justify-between px-4 py-2 hover:bg-surface-container border-b border-surface-variant/40 last:border-0"
                      >
                        <div className="min-w-0 mr-3">
                          <p className="font-label-md text-xs text-on-surface font-semibold truncate">
                            {friend.fullName}
                          </p>
                          <p className="text-[10px] text-secondary truncate">{friend.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleShareWithFriend(friend)}
                          disabled={isSharingDirect}
                          className="px-2.5 py-1 text-[11px] text-primary hover:bg-primary/10 rounded font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          Share
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-secondary text-xs select-none">
                      {friends.length === 0 ? (
                        <>
                          <p className="font-medium">No friends available</p>
                          <p className="text-[10px] text-secondary/60 mt-0.5">
                            You must be accepted friends to share documents directly.
                          </p>
                        </>
                      ) : (
                        'No matching friends found.'
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Existing Shares List with Timestamps */}
              {isLoadingShares ? (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-secondary">
                  <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Loading shared users...</span>
                </div>
              ) : existingShares.length > 0 && (
                <div className="space-y-1.5 pt-2 animate-in fade-in duration-200">
                  <span className="font-label-md text-label-md text-secondary select-none font-medium">
                    Shared with ({existingShares.length})
                  </span>
                  <div className="border border-surface-variant/60 rounded-xl overflow-hidden max-h-[140px] overflow-y-auto bg-surface-container-low">
                    {existingShares.map((share) => (
                      <div
                        key={share.userId}
                        className="flex items-center justify-between px-4 py-2 border-b border-surface-variant/30 last:border-0 hover:bg-surface-container"
                      >
                        <div className="min-w-0 mr-3">
                          <p className="font-label-md text-xs text-on-surface font-semibold truncate">
                            {share.fullName || 'User'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-secondary">
                            <span className="truncate">{share.email}</span>
                            {share.createdAt && (
                              <>
                                <span>•</span>
                                <span className="truncate text-secondary/80">
                                  {new Date(share.createdAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-surface-variant flex items-center justify-end select-none">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-secondary hover:bg-surface-variant hover:text-on-surface text-on-surface-variant rounded-lg font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default ShareModal;
