import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import DocumentPreview from '../components/document/DocumentPreview';
import DocumentChat from '../components/document/DocumentChat';
import ShareModal from '../components/dashboard/ShareModal';
import SaveToFolderModal from '../components/dashboard/SaveToFolderModal';
import { folderService } from '../services/folderService';
import type { DocumentFolderResponse } from '../services/folderService';
import { documentService } from '../services/documentService';
import { isOfflinePreviewSupported, offlineDocumentService } from '../services/offlineDocumentService';
import { deleteOfflineDocument, getOfflineDocument, isOfflineDocumentSaved } from '../lib/offlineDocumentDb';
import { markSharedDocAsRead } from '../lib/sharedDocReadDb';
import type { OfflineDocumentRecord } from '../lib/offlineDocumentDb';
import subscriptionService from '../services/subscriptionService';
import { mockFileItems, mockSuggestedItems } from '../features/dashboard/dashboard.mock';
import type { StorageUsage } from '../features/dashboard/dashboard.mock';
import { useConfirm } from '../contexts/ConfirmContext';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const calculateStorageUsage = (myFilesSize: number, sharedFilesSize: number, storageLimitGb: number, isLoggedIn: boolean) => {
  const usedBytes = isLoggedIn ? myFilesSize + sharedFilesSize : 0;
  const totalBytes = isLoggedIn ? storageLimitGb * 1024 * 1024 * 1024 : 2 * 1024 * 1024 * 1024;
  const usedPercentage = Math.min(100, Math.round((usedBytes / totalBytes) * 100));
  
  return {
    usedBytes,
    totalBytes,
    usedPercentage,
    formattedUsed: formatBytes(usedBytes),
    formattedTotal: `${isLoggedIn ? storageLimitGb : 2} GB`,
  };
};

const formatOfflineRecordDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Unknown';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isValidOfflineRecord = (record: OfflineDocumentRecord | undefined): record is OfflineDocumentRecord =>
  !!record &&
  record.blob instanceof Blob &&
  record.blob.size > 0 &&
  Number.isFinite(record.documentId) &&
  !!record.fileName &&
  !!record.contentType &&
  Number.isFinite(record.fileSize) &&
  record.fileSize > 0;

export const FileDetailPage: React.FC = () => {
  const confirmAction = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    fromTab?: string;
    fromFolderId?: number | null;
    fromFolderName?: string | null;
    preferOffline?: boolean;
    offlineUserId?: number | null;
  } | null;

  const fromTab = state?.fromTab || 'My Files';
  const fromFolderId = state?.fromFolderId !== undefined ? state.fromFolderId : null;
  const fromFolderName = state?.fromFolderName !== undefined ? state.fromFolderName : null;
  const preferOffline = !!state?.preferOffline;

  const [documentDetails, setDocumentDetails] = useState<{
    id: number | null;
    name: string;
    size: string;
    lastModified: string;
    previewUrl: string | null;
    downloadUrl: string | null;
    contentType: string | null;
    status: string;
    userId?: number | null;
    isPublic?: boolean;
    fileSizeBytes?: number;
    uploadedAt?: string;
  } | null>(null);
  const [storage, setStorage] = useState<StorageUsage | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveToOpen, setIsSaveToOpen] = useState(false);
  const [allFolders, setAllFolders] = useState<DocumentFolderResponse[]>([]);
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [isOfflineActionLoading, setIsOfflineActionLoading] = useState(false);
  const [offlineUnavailableMessage, setOfflineUnavailableMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [offlineFeedback, setOfflineFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const saveInProgressRef = useRef(false);
  const removeInProgressRef = useRef(false);

  const isLoggedIn = !!localStorage.getItem('token');
  const currentUserId = Number(localStorage.getItem('userId')) || null;

  const replaceLocalBlobUrl = (nextUrl: string | null) => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    blobUrlRef.current = nextUrl;
    setLocalBlobUrl(nextUrl);
  };

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineFeedback({ type: 'success', message: 'Back online. Document actions are available again.' });
    };
    const handleOffline = () => {
      setIsOnline(false);
      setOfflineFeedback({ type: 'info', message: 'You are offline. Saved documents can still be opened from this browser.' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Khi mở trang, tải metadata tài liệu trước để DocumentChat biết documentId và chỉ cho hỏi khi status là READY.
    const loadDetails = async () => {
      setIsLoading(true);
      setOfflineUnavailableMessage(null);
      setOfflineFeedback(null);
      replaceLocalBlobUrl(null);
      setIsOfflineSaved(false);

      const numericId = Number(id);
      if (!isNaN(numericId) && (!isOnline || preferOffline)) {
        try {
          const offlineRecord = currentUserId
            ? await getOfflineDocument(numericId, currentUserId)
            : undefined;
          if (isValidOfflineRecord(offlineRecord)) {
            let blobUrl: string;
            try {
              blobUrl = URL.createObjectURL(offlineRecord.blob);
            } catch (e) {
              console.error('Failed to create offline document URL:', e);
              setDocumentDetails(null);
              setOfflineUnavailableMessage('Document unavailable offline. The saved copy could not be opened by this browser.');
              setOfflineFeedback({ type: 'error', message: 'The saved copy could not be opened. Try reconnecting and saving it again.' });
              setIsLoading(false);
              return;
            }

            replaceLocalBlobUrl(blobUrl);
            setIsOfflineSaved(true);
            setDocumentDetails({
              id: offlineRecord.documentId,
              name: offlineRecord.fileName,
              size: formatBytes(offlineRecord.fileSize),
              lastModified: formatOfflineRecordDate(offlineRecord.lastModified),
              previewUrl: null,
              downloadUrl: null,
              contentType: offlineRecord.contentType,
              status: 'READY',
              userId: offlineRecord.userId,
              fileSizeBytes: offlineRecord.fileSize,
              uploadedAt: offlineRecord.lastModified,
            });
          } else if (offlineRecord) {
            if (currentUserId) await deleteOfflineDocument(numericId, currentUserId);
            setDocumentDetails(null);
            setOfflineUnavailableMessage('Document unavailable offline. The saved copy was corrupted and has been removed.');
            setOfflineFeedback({ type: 'error', message: 'The offline copy was corrupted. Reconnect and save the document again.' });
          } else {
            setDocumentDetails(null);
            setOfflineUnavailableMessage('Document unavailable offline. Reconnect and save it for offline use first.');
          }
        } catch (e) {
          console.error('Failed to load offline document:', e);
          setDocumentDetails(null);
          setOfflineUnavailableMessage('Document unavailable offline. The saved copy could not be opened.');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Storage and personal document APIs require authentication; guests only load public metadata below.
      if (isLoggedIn) {
        try {
          const [subRes, myDocsRes, sharedDocsRes] = await Promise.all([
            subscriptionService.getMySubscription().catch(() => null),
            documentService.getMyDocuments().catch(() => null),
            documentService.getSharedWithMeDocuments().catch(() => null),
          ]);

          let limitGb = 2;
          if (subRes && subRes.data && subRes.data.success && subRes.data.data) {
            limitGb = subRes.data.data.storageLimitGb || 2;
          }

          let myTotal = 0;
          if (myDocsRes && myDocsRes.data && myDocsRes.data.success && myDocsRes.data.data) {
            myTotal = myDocsRes.data.data.reduce((sum, f) => sum + (f.fileSize || 0), 0);
          }

          let sharedTotal = 0;
          if (sharedDocsRes && sharedDocsRes.data && sharedDocsRes.data.success && sharedDocsRes.data.data) {
            sharedTotal = sharedDocsRes.data.data.reduce((sum, f) => sum + (f.fileSize || 0), 0);
          }

          const computedStorage = calculateStorageUsage(myTotal, sharedTotal, limitGb, true);
          setStorage(computedStorage);
        } catch (e) {
          console.error('Failed to load storage details:', e);
        }
      }

      if (!isNaN(numericId)) {
        // Lấy chi tiết từ backend; nếu tài liệu không thuộc user thì lần lượt thử shared document và public document.
        let response;
        let isPublicDoc = false;
        let isSharedDoc = false;
        
        if (!isLoggedIn) {
          response = await documentService.getPublicDocumentDetail(numericId);
          isPublicDoc = !!(response.data && response.data.success);
        } else {
          try {
            response = await documentService.getDocumentDetail(numericId);
            if (!response.data || !response.data.success) {
              // Nếu không phải document owner thì thử document được share cho user.
              const sharedResponse = await documentService.getSharedWithMeDocumentDetail(numericId);
              if (sharedResponse.data && sharedResponse.data.success) {
                response = sharedResponse;
                isSharedDoc = true;
              } else {
                // Fallback cuối cho document public của user khác, ví dụ mở từ community page.
                const publicResponse = await documentService.getPublicDocumentDetail(numericId);
                if (publicResponse.data && publicResponse.data.success) {
                  response = publicResponse;
                  isPublicDoc = true;
                }
              }
            }
          } catch (e) {
            console.warn('Failed to fetch private document detail, checking shared-with-me:', e);
            try {
              const sharedResponse = await documentService.getSharedWithMeDocumentDetail(numericId);
              if (sharedResponse.data && sharedResponse.data.success) {
                response = sharedResponse;
                isSharedDoc = true;
              } else {
                const publicResponse = await documentService.getPublicDocumentDetail(numericId);
                if (publicResponse.data && publicResponse.data.success) {
                  response = publicResponse;
                  isPublicDoc = true;
                }
              }
            } catch (sharedErr) {
              console.warn('Failed to load as shared document, checking public:', sharedErr);
              try {
                const publicResponse = await documentService.getPublicDocumentDetail(numericId);
                if (publicResponse.data && publicResponse.data.success) {
                  response = publicResponse;
                  isPublicDoc = true;
                }
              } catch (pubErr) {
                console.error('Failed to load as public document:', pubErr);
              }
            }
          }
        }
        
        if (response && response.data && response.data.success) {
          const doc = response.data.data;

          // Chỉ đánh dấu đã đọc sau khi backend xác nhận tài liệu thực sự được share cho user hiện tại.
          if (isSharedDoc) {
            markSharedDocAsRead(doc.documentId, currentUserId);
          }
          
          let previewUrl: string | null = null;
          let contentType: string | null = doc.contentType;
          try {
            const previewResponse = isSharedDoc
              ? await documentService.getSharedWithMePreviewUrl(numericId)
              : isPublicDoc
              ? await documentService.getPublicDocumentPreviewUrl(numericId)
              : await documentService.getDocumentPreviewUrl(numericId);
            if (previewResponse.data && previewResponse.data.success) {
              previewUrl = previewResponse.data.data.url;
              if (previewResponse.data.data.contentType) {
                contentType = previewResponse.data.data.contentType;
              }
            }
          } catch (e) {
            console.error('Failed to load preview URL:', e);
          }

          let downloadUrl: string | null = null;
          try {
            const downloadResponse = isSharedDoc
              ? await documentService.getSharedWithMeDownloadUrl(numericId)
              : isPublicDoc
              ? await documentService.getPublicDocumentDownloadUrl(numericId)
              : await documentService.getDocumentDownloadUrl(numericId);
            if (downloadResponse.data && downloadResponse.data.success) {
              downloadUrl = downloadResponse.data.data.url;
            }
          } catch (e) {
            console.error('Failed to load download URL:', e);
          }

          setDocumentDetails({
            id: doc.documentId,
            name: doc.originalFileName,
            size: formatBytes(doc.fileSize),
            lastModified: new Date(doc.uploadedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            previewUrl,
            downloadUrl,
            contentType,
            status: doc.status,
            userId: doc.userId,
            isPublic: doc.isPublic,
            fileSizeBytes: doc.fileSize,
            uploadedAt: doc.uploadedAt,
          });
          setIsOfflineSaved(currentUserId ? await isOfflineDocumentSaved(doc.documentId, currentUserId) : false);
          setIsLoading(false);
          return;
        }

        if (!isLoggedIn) {
          setDocumentDetails(null);
          setOfflineUnavailableMessage('This public document is no longer available.');
          setIsLoading(false);
          return;
        }
      }

      // Dữ liệu mock chỉ được dùng khi không resolve được document thật từ backend.
      const listFile = mockFileItems.find((f) => f.id === id);
      if (listFile) {
        setDocumentDetails({
          id: null,
          name: listFile.name,
          size: listFile.size,
          lastModified: listFile.lastModified,
          previewUrl: null,
          downloadUrl: null,
          contentType: listFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          status: 'READY',
          userId: null,
        });
      } else {
        const suggestedFile = mockSuggestedItems.find((f) => f.id === id);
        if (suggestedFile) {
          setDocumentDetails({
            id: null,
            name: suggestedFile.name,
            size: suggestedFile.metadata ? suggestedFile.metadata.split('•')[1]?.trim() || '1.2 MB' : '1.2 MB',
            lastModified: '2 hours ago',
            previewUrl: null,
            downloadUrl: null,
            contentType: suggestedFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            status: 'READY',
            userId: null,
          });
        } else {
          // Tạo document mock mặc định để UI vẫn có dữ liệu hiển thị khi backend không trả document.
          setDocumentDetails({
            id: null,
            name: 'Company Q3 Strategy & Market Analysis.pdf',
            size: '2.4 MB',
            lastModified: '2 hours ago',
            previewUrl: null,
            downloadUrl: null,
            contentType: 'application/pdf',
            status: 'READY',
            userId: null,
          });
        }
      }
      setIsLoading(false);
    };

    loadDetails();
  }, [id, isLoggedIn, navigate, currentUserId, isOnline, preferOffline]);

  useEffect(() => {
    if (!isLoggedIn) return;
    folderService.getFolders().then((res) => {
      if (res.data && res.data.success) {
        setAllFolders(res.data.data);
      }
    }).catch((e) => console.error('Failed to load user folders:', e));
  }, [isLoggedIn]);

  const handleSaveToMyFilesSubmit = async (targetFolderId: number | string | null) => {
    if (!isLoggedIn) {
      setIsSaveToOpen(false);
      navigate('/login');
      return;
    }
    if (!documentDetails?.id) return;
    const numericFolderId = targetFolderId === null ? null : Number(targetFolderId);
    try {
      let response = await documentService.savePublicDocumentToMyFiles(documentDetails.id, numericFolderId);
      if (!response.data || !response.data.success) {
        response = await documentService.saveSharedWithMeDocumentToMyFiles(documentDetails.id, numericFolderId);
      }

      if (response.data && response.data.success) {
        alert(`Saved "${documentDetails.name}" to My Files successfully!`);
        setIsSaveToOpen(false);
      } else {
        alert(response.error || 'Failed to save document to My Files.');
      }
    } catch {
      alert('An error occurred while saving the document to My Files.');
    }
  };

  const handleToggleVisibility = async () => {
    if (!documentDetails?.id) return;
    const nextPublicState = !documentDetails.isPublic;
    try {
      const response = await documentService.updateDocumentVisibility(documentDetails.id, nextPublicState);
      if (response.data && response.data.success) {
        setDocumentDetails((prev) => (prev ? { ...prev, isPublic: nextPublicState } : null));
        alert(nextPublicState ? 'Document is now Publicly visible in Community!' : 'Document is now Private!');
      } else {
        alert(response.error || 'Failed to update document visibility.');
      }
    } catch {
      alert('An error occurred while updating document visibility.');
    }
  };

  const handleTabChange = (tabName: string) => {
    if (tabName === 'Offline') {
      navigate('/offline-documents');
      return;
    }

    if (tabName !== 'AI Assistant' && tabName !== 'Settings') {
      navigate('/dashboard', { state: { activeTab: tabName } });
    }
  };

  // Chat online chỉ được render khi browser có mạng; đây là guard UI, backend vẫn kiểm tra quyền độc lập.
  const canUseOnlineChat = isLoggedIn && isOnline;
  const canSaveCurrentDocument =
    isLoggedIn &&
    !!documentDetails?.id &&
    isOfflinePreviewSupported(documentDetails.name, documentDetails.contentType || '');

  const handleSaveOffline = async () => {
    if (saveInProgressRef.current) return;

    if (!documentDetails?.id || documentDetails.fileSizeBytes == null || !documentDetails.uploadedAt) {
      setOfflineFeedback({ type: 'error', message: 'This document cannot be saved offline yet.' });
      return;
    }

    if (!canSaveCurrentDocument) {
      setOfflineFeedback({
        type: 'error',
        message: 'This file type is not supported for offline preview yet. You can still download it normally.',
      });
      return;
    }

    if (!isOnline) {
      setOfflineFeedback({ type: 'error', message: 'Reconnect to the internet before saving this document offline.' });
      return;
    }

    saveInProgressRef.current = true;
    setIsOfflineActionLoading(true);
    setOfflineFeedback({ type: 'info', message: 'Downloading document for offline use...' });
    try {
      if (!currentUserId) throw new Error('Sign in before saving offline documents.');
      await offlineDocumentService.saveDocumentForOffline({
        documentId: documentDetails.id,
        userId: currentUserId,
        fileName: documentDetails.name,
        contentType: documentDetails.contentType || 'application/octet-stream',
        fileSize: documentDetails.fileSizeBytes,
        lastModified: documentDetails.uploadedAt,
      });
      setIsOfflineSaved(true);
      setOfflineFeedback({ type: 'success', message: `"${documentDetails.name}" is now available offline.` });
    } catch (e) {
      console.error('Failed to save document offline:', e);
      setOfflineFeedback({
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to save this document offline. Try again.',
      });
    } finally {
      saveInProgressRef.current = false;
      setIsOfflineActionLoading(false);
    }
  };

  const handleRemoveOffline = async () => {
    if (!documentDetails?.id) return;
    if (removeInProgressRef.current) return;
    const confirmed = await confirmAction({ title: 'Remove offline copy?', message: `Remove the offline copy of "${documentDetails.name}" from this browser?`, confirmLabel: 'Remove' });
    if (!confirmed) return;

    removeInProgressRef.current = true;
    setIsOfflineActionLoading(true);
    setOfflineFeedback({ type: 'info', message: 'Removing offline copy...' });
    try {
      if (!currentUserId) throw new Error('Sign in before managing offline documents.');
      await deleteOfflineDocument(documentDetails.id, currentUserId);
      setIsOfflineSaved(false);
      if (localBlobUrl) {
        replaceLocalBlobUrl(null);
      }
      if (!isOnline) {
        setDocumentDetails(null);
        setOfflineUnavailableMessage('Document unavailable offline. Reconnect and save it for offline use first.');
      }
      setOfflineFeedback({ type: 'success', message: `Offline copy removed for "${documentDetails.name}".` });
    } catch (e) {
      console.error('Failed to remove offline document:', e);
      setOfflineFeedback({ type: 'error', message: 'Could not remove the offline copy. Try again.' });
    } finally {
      removeInProgressRef.current = false;
      setIsOfflineActionLoading(false);
    }
  };

  if (isLoading || !documentDetails) {
    return (
      <DashboardLayout activeTab={fromTab} onTabChange={handleTabChange} fluid={true} storage={storage}>
        <div className="flex-1 flex flex-col items-center justify-center py-40 gap-3 w-full bg-surface">
          {offlineUnavailableMessage ? (
            <>
              <span className="material-symbols-outlined text-[44px] text-secondary select-none">cloud_off</span>
              <span className="font-body-md text-secondary select-none">{offlineUnavailableMessage}</span>
              {offlineFeedback && (
                <span className={`font-body-md text-sm select-none ${
                  offlineFeedback.type === 'error'
                    ? 'text-error'
                    : offlineFeedback.type === 'success'
                    ? 'text-primary'
                    : 'text-secondary'
                }`}>
                  {offlineFeedback.message}
                </span>
              )}
            </>
          ) : (
            <>
              <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-body-md text-secondary select-none">Loading document details...</span>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      activeTab={fromTab}
      onTabChange={handleTabChange}
      fluid={true}
      storage={storage}
    >
      <div className="relative flex flex-col lg:flex-row flex-1 overflow-hidden h-full w-full bg-surface">
        {/* Left Side: Document Preview (takes up flex-[6] or full-width) */}
        <DocumentPreview
          fileName={documentDetails.name}
          fileSize={documentDetails.size}
          lastModified={documentDetails.lastModified}
          previewUrl={documentDetails.previewUrl}
          localBlobUrl={localBlobUrl}
          downloadUrl={documentDetails.downloadUrl}
          contentType={documentDetails.contentType}
          onDownloadClick={() => {
            if (documentDetails.downloadUrl) {
              window.open(documentDetails.downloadUrl, '_blank');
            } else {
              alert(`Downloading "${documentDetails.name}"...`);
            }
          }}
          onShareClick={() => {
            if (!isLoggedIn) {
              alert('Please log in to share documents.');
              navigate('/login');
              return;
            }
            if (documentDetails.id) {
              setIsShareModalOpen(true);
            } else {
              alert('Sharing is not available for offline or unindexed preview documents.');
            }
          }}
          onSaveToMyFilesClick={() => {
            if (!isLoggedIn) {
              alert('Please log in to save documents to My Files.');
              navigate('/login');
              return;
            }
            if (documentDetails.id) {
              setIsSaveToOpen(true);
            } else {
              alert('Save to My Files is not available for this document.');
            }
          }}
          isPublic={documentDetails.isPublic || false}
          onToggleVisibilityClick={
            documentDetails.id &&
            fromTab !== 'Community' &&
            fromTab !== 'Shared' &&
            documentDetails.userId === currentUserId
              ? handleToggleVisibility
              : undefined
          }
          onBack={() => {
            if (fromTab === 'Offline') {
              navigate('/offline-documents');
              return;
            }

            navigate('/dashboard', {
              state: {
                activeTab: fromTab,
                folderId: fromFolderId,
                folderName: fromFolderName,
              },
            });
          }}
          isChatOpen={isChatOpen && canUseOnlineChat}
          onToggleChat={canUseOnlineChat ? () => setIsChatOpen(!isChatOpen) : undefined}
        />

        {/* Chat nhận đúng documentId, tên file và trạng thái từ metadata để chạy single-document RAG. */}
        {isChatOpen && canUseOnlineChat && (
          <DocumentChat
            documentId={documentDetails.id}
            fileName={documentDetails.name}
            status={documentDetails.status}
            onClose={() => setIsChatOpen(false)}
          />
        )}
        {isLoggedIn && <div className="absolute right-4 bottom-4 z-20 flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 shadow-lg">
          <div className="flex flex-col gap-0.5">
            <span className={`font-body-md text-sm ${isOfflineSaved ? 'text-primary' : 'text-secondary'}`}>
              {isOfflineSaved ? 'Available Offline' : isOnline ? 'Online only' : 'Offline'}
            </span>
            {offlineFeedback && (
              <span className={`font-body-md text-xs max-w-[320px] ${
                offlineFeedback.type === 'error'
                  ? 'text-error'
                  : offlineFeedback.type === 'success'
                  ? 'text-primary'
                  : 'text-secondary'
              }`}>
                {offlineFeedback.message}
              </span>
            )}
          </div>
          {isOfflineSaved ? (
            <button
              onClick={handleRemoveOffline}
              disabled={isOfflineActionLoading}
              className="px-3 py-1.5 rounded bg-surface-container-high text-on-surface text-sm hover:bg-surface-container-highest disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isOfflineActionLoading ? 'Removing...' : 'Remove Offline Copy'}
            </button>
          ) : (
            <button
              onClick={handleSaveOffline}
              disabled={isOfflineActionLoading || !isOnline || !documentDetails.id}
              className="px-3 py-1.5 rounded bg-primary text-on-primary text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isOfflineActionLoading ? 'Downloading...' : 'Save Offline'}
            </button>
          )}
        </div>}
      </div>

      {documentDetails?.id && (
        <>
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            documentId={documentDetails.id}
            documentName={documentDetails.name}
            isInitiallyPublic={documentDetails.isPublic || false}
            onVisibilityChange={(isPublic) => {
              setDocumentDetails((prev) => (prev ? { ...prev, isPublic } : null));
            }}
          />

          <SaveToFolderModal
            isOpen={isSaveToOpen}
            onClose={() => setIsSaveToOpen(false)}
            documentName={documentDetails.name}
            folders={allFolders.map((f) => ({
              folderId: f.folderId,
              name: f.name,
            }))}
            onSave={handleSaveToMyFilesSubmit}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default FileDetailPage;
