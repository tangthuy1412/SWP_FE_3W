import React, { useState, useEffect } from 'react';
import { documentService } from '../../services/documentService';
import type {
  DocumentShareApprovalType,
  ShareApprovalStatus,
} from '../../services/documentService';
import { friendService } from '../../services/friendService';
import type { FriendResponse } from '../../services/friendService';
import { useConfirm } from '../../contexts/ConfirmContext';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  documentName: string;
  isInitiallyPublic: boolean;
  initialApprovalStatus?: ShareApprovalStatus;
  onApprovalStatusChange?: (status: ShareApprovalStatus) => void;
}

interface ExistingShare {
  documentShareId: number;
  userId: number;
  email: string;
  fullName: string;
  status: ShareApprovalStatus;
  createdAt?: string;
}

const approvalStatusDetails: Record<ShareApprovalStatus, { label: string; classes: string }> = {
  UNREVIEWED: { label: 'Not submitted', classes: 'bg-surface-container-high text-secondary' },
  PENDING_APPROVAL: { label: 'Pending admin approval', classes: 'bg-tertiary-fixed/30 text-tertiary' },
  APPROVED: { label: 'Approved', classes: 'bg-success-container/40 text-success' },
  REJECTED: { label: 'Rejected', classes: 'bg-error-container/40 text-error' },
};

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentName,
  isInitiallyPublic,
  initialApprovalStatus,
  onApprovalStatusChange,
}) => {
  const confirmAction = useConfirm();
  const [activeTab, setActiveTab] = useState<'link' | 'friends'>('link');
  const [friends, setFriends] = useState<FriendResponse[]>([]);
  const [isLinkSharingEnabled, setIsLinkSharingEnabled] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [approvalStatuses, setApprovalStatuses] = useState<Partial<Record<DocumentShareApprovalType, ShareApprovalStatus>>>({});
  
  // Direct sharing states
  const [friendSearch, setFriendSearch] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<number>>(() => new Set());
  const [isSharingDirect, setIsSharingDirect] = useState(false);
  const [directShareStatus, setDirectShareStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Track shares fetched from backend
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setIsLinkSharingEnabled(false);
      setShareToken(null);
      setCopySuccess(false);
      setFriendSearch('');
      setCustomEmail('');
      setSelectedFriendIds(new Set());
      setDirectShareStatus(null);
      setExistingShares([]);
      setApprovalStatuses(
        isInitiallyPublic && initialApprovalStatus
          ? { PUBLIC: initialApprovalStatus }
          : {},
      );
      
      // Load friends list and existing shares for direct sharing
      const loadInitialData = async () => {
        setIsLoadingShares(true);
        try {
          const [friendsRes, sharesRes, approvalsRes] = await Promise.all([
            friendService.getFriends().catch(() => null),
            documentService.getDocumentShares(documentId).catch(() => null),
            documentService.getMyDocumentShareApprovals({ size: 100 }).catch(() => null),
          ]);

          if (friendsRes?.data && friendsRes.data.success) {
            setFriends(friendsRes.data.data);
          }

          if (sharesRes?.data && sharesRes.data.success) {
            setExistingShares(
              sharesRes.data.data.map((s) => ({
                documentShareId: s.documentShareId,
                userId: s.sharedWithUserId,
                email: s.sharedWithEmail,
                fullName: s.sharedWithName,
                status: s.status || 'PENDING_APPROVAL',
                createdAt: s.createdAt,
              }))
            );
          }

          if (approvalsRes?.data?.success) {
            const documentApprovals = (approvalsRes.data.data.content || [])
              .filter((approval) => approval.documentId === documentId);
            const statuses = documentApprovals.reduce<Partial<Record<DocumentShareApprovalType, ShareApprovalStatus>>>(
              (result, approval) => ({ ...result, [approval.shareType]: approval.status }),
              isInitiallyPublic && initialApprovalStatus
                ? { PUBLIC: initialApprovalStatus }
                : {},
            );
            setApprovalStatuses(statuses);
            setIsLinkSharingEnabled(
              !!statuses.LINK && statuses.LINK !== 'REJECTED',
            );
            if (statuses.LINK === 'APPROVED' || statuses.LINK === 'PENDING_APPROVAL') {
              try {
                // Tận dụng hàm createShareLink, Backend sẽ tự động trả về link cũ đang active
                const linkRes = await documentService.createShareLink(documentId);
                if (linkRes.data && linkRes.data.success) {
                  setShareToken(linkRes.data.data.token);
                }
              } catch (err) {
                console.error('Không thể khôi phục token chia sẻ:', err);
              }
            }
          }
        } catch (e) {
          console.error('Failed to load modal data:', e);
        } finally {
          setIsLoadingShares(false);
        }
      };
      loadInitialData();
    }
  }, [isOpen, documentId, isInitiallyPublic, initialApprovalStatus]);
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
          setApprovalStatuses((current) => ({ ...current, LINK: 'PENDING_APPROVAL' }));
          onApprovalStatusChange?.('PENDING_APPROVAL');
        } else {
          alert('Failed to submit link sharing request: ' + (response.error || 'Server error'));
        }
      } else {
        const response = await documentService.disableShareLink(documentId);
        if (response.data && response.data.success) {
          setShareToken(null);
          setIsLinkSharingEnabled(false);
          setApprovalStatuses((current) => ({ ...current, LINK: undefined }));
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
          message: `Share request sent for ${targetEmail}. Access starts after admin approval.`,
        });
        setApprovalStatuses((current) => ({ ...current, DIRECT: 'PENDING_APPROVAL' }));
        onApprovalStatusChange?.('PENDING_APPROVAL');
        setCustomEmail('');
        
        // Add or update in existing shares
        setExistingShares((prev) => [
          {
            documentShareId: shareData.documentShareId,
            userId: shareData.sharedWithUserId,
            email: shareData.sharedWithEmail,
            fullName: shareData.sharedWithName,
            status: shareData.status || 'PENDING_APPROVAL',
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
          message: `Share request sent for ${friend.fullName}. Access starts after admin approval.`,
        });
        setApprovalStatuses((current) => ({ ...current, DIRECT: 'PENDING_APPROVAL' }));
        onApprovalStatusChange?.('PENDING_APPROVAL');
        
        // Add to existing shares
        setExistingShares((prev) => [
          {
            documentShareId: shareData.documentShareId,
            userId: friend.userId,
            email: friend.email,
            fullName: friend.fullName,
            status: shareData.status || 'PENDING_APPROVAL',
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

  const handleBulkShare = async () => {
    const selectedFriends = friends.filter((friend) => selectedFriendIds.has(friend.userId));
    if (selectedFriends.length === 0) return;

    const confirmed = await confirmAction({
      title: 'Share Document?',
      message: `Share "${documentName}" with ${selectedFriends.length} selected friend${selectedFriends.length === 1 ? '' : 's'}?`,
      confirmLabel: 'Share',
      variant: 'primary',
    });
    if (!confirmed) return;

    setIsSharingDirect(true);
    setDirectShareStatus(null);
    try {
      const response = await documentService.bulkShareDocumentWithUsers(
        documentId,
        selectedFriends.map((friend) => friend.email),
      );
      if (response.data?.success) {
        const updatedShares: ExistingShare[] = (response.data.data || []).map((share) => ({
          documentShareId: share.documentShareId,
          userId: share.sharedWithUserId,
          email: share.sharedWithEmail,
          fullName: share.sharedWithName,
          status: share.status || 'PENDING_APPROVAL',
          createdAt: share.createdAt || new Date().toISOString(),
        }));
        const updatedUserIds = new Set(updatedShares.map((share) => share.userId));
        setExistingShares((current) => [
          ...updatedShares,
          ...current.filter((share) => !updatedUserIds.has(share.userId)),
        ]);
        setSelectedFriendIds(new Set());
        setApprovalStatuses((current) => ({ ...current, DIRECT: 'PENDING_APPROVAL' }));
        onApprovalStatusChange?.('PENDING_APPROVAL');
        setDirectShareStatus({
          type: 'success',
          message: `Share requests sent for ${updatedShares.length} user${updatedShares.length === 1 ? '' : 's'}. Access starts after admin approval.`,
        });
      } else {
        setDirectShareStatus({
          type: 'error',
          message: response.error || 'Failed to share the document with the selected users.',
        });
      }
    } catch {
      setDirectShareStatus({
        type: 'error',
        message: 'An error occurred while sharing the document with the selected users.',
      });
    } finally {
      setIsSharingDirect(false);
    }
  };

  const toggleFriendSelection = (userId: number) => {
    setSelectedFriendIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Approved and pending recipients are not selectable; rejected shares can be submitted again.
  const filteredFriends = friends.filter(
    (friend) => {
      const existingShare = existingShares.find((share) => share.userId === friend.userId);
      return (
        (friend.fullName.toLowerCase().includes(friendSearch.toLowerCase()) ||
          friend.email.toLowerCase().includes(friendSearch.toLowerCase())) &&
        (!existingShare || existingShare.status === 'REJECTED')
      );
    },
  );
  const allVisibleFriendsSelected = filteredFriends.length > 0
    && filteredFriends.every((friend) => selectedFriendIds.has(friend.userId));

  const toggleAllVisibleFriends = () => {
    setSelectedFriendIds((current) => {
      const next = new Set(current);
      if (allVisibleFriendsSelected) {
        filteredFriends.forEach((friend) => next.delete(friend.userId));
      } else {
        filteredFriends.forEach((friend) => next.add(friend.userId));
      }
      return next;
    });
  };

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : '';
  const linkApprovalStatus = approvalStatuses.LINK;
  const linkInputValue = isLoadingLink
    ? 'Creating link request...'
    : shareUrl || (linkApprovalStatus === 'APPROVED'
      ? 'Link approved. The original link is active.'
      : 'Link request is waiting for admin approval.');

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
                    Link Sharing Request
                  </h4>
                  <p className="text-secondary text-body-sm mt-0.5 select-none">
                    After admin approval, anyone with this link can view and download the file.
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
                  {linkApprovalStatus && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-xs">
                      <span className="text-secondary">Link access</span>
                      <span className={`rounded-full px-2 py-1 font-semibold ${approvalStatusDetails[linkApprovalStatus].classes}`}>
                        {approvalStatusDetails[linkApprovalStatus].label}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="font-label-md text-label-md text-secondary select-none">
                      {shareToken ? 'Shared Link' : 'Link status'}
                    </span>
                    <div className="flex rounded-lg border border-surface-variant bg-surface-container-high overflow-hidden transition-all">
                      <input
                        type="text"
                        readOnly
                        value={linkInputValue}
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
                  <span>Updating link request...</span>
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
                <div className="flex flex-wrap items-center justify-between gap-2 select-none">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-secondary">
                    <input
                      type="checkbox"
                      checked={allVisibleFriendsSelected}
                      onChange={toggleAllVisibleFriends}
                      disabled={isSharingDirect || filteredFriends.length === 0}
                      className="h-4 w-4 accent-primary"
                    />
                    Select visible
                  </label>
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
                        <input
                          type="checkbox"
                          checked={selectedFriendIds.has(friend.userId)}
                          onChange={() => toggleFriendSelection(friend.userId)}
                          disabled={isSharingDirect}
                          aria-label={`Select ${friend.fullName}`}
                          className="mr-3 h-4 w-4 shrink-0 accent-primary"
                        />
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="font-label-md text-xs text-on-surface font-semibold truncate">
                            {friend.fullName}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-secondary truncate">{friend.email}</p>
                            {existingShares.some((share) => share.userId === friend.userId && share.status === 'REJECTED') && (
                              <span className="shrink-0 text-[10px] font-semibold text-error">Rejected</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleShareWithFriend(friend)}
                          disabled={isSharingDirect}
                          title={`Share with ${friend.fullName}`}
                          aria-label={`Share with ${friend.fullName}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">person_add</span>
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

                <button
                  type="button"
                  onClick={handleBulkShare}
                  disabled={isSharingDirect || selectedFriendIds.size === 0}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {isSharingDirect ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">group_add</span>
                  )}
                  Share selected{selectedFriendIds.size > 0 ? ` (${selectedFriendIds.size})` : ''}
                </button>
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
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate font-label-md text-xs font-semibold text-on-surface">
                              {share.fullName || 'User'}
                            </p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${approvalStatusDetails[share.status].classes}`}>
                              {approvalStatusDetails[share.status].label}
                            </span>
                          </div>
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
