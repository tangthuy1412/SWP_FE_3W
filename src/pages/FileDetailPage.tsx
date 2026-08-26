import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import DocumentPreview from '../components/document/DocumentPreview';
import DocumentChat from '../components/document/DocumentChat';
import ChatErrorBoundary from '../components/document/ChatErrorBoundary';
import ShareModal from '../components/dashboard/ShareModal';
import SaveToFolderModal from '../components/dashboard/SaveToFolderModal';
import { folderService } from '../services/folderService';
import type { DocumentFolderResponse } from '../services/folderService';
import { documentService } from '../services/documentService';
import type { ShareApprovalStatus } from '../services/documentService';
import { markSharedDocAsRead } from '../lib/sharedDocReadDb';
import subscriptionService from '../services/subscriptionService';
import type { StorageUsage } from '../features/dashboard/dashboard.mock';

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

export const FileDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    fromTab?: string;
    fromFolderId?: number | null;
    fromFolderName?: string | null;
  } | null;

  const fromTab = state?.fromTab || 'My Files';
  const fromFolderId = state?.fromFolderId !== undefined ? state.fromFolderId : null;
  const fromFolderName = state?.fromFolderName !== undefined ? state.fromFolderName : null;

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
    shareApprovalStatus?: ShareApprovalStatus;
  } | null>(null);
  const [storage, setStorage] = useState<StorageUsage | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Keep the document preview independent from AI initialization. The user opens chat when needed.
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveToOpen, setIsSaveToOpen] = useState(false);
  const [allFolders, setAllFolders] = useState<DocumentFolderResponse[]>([]);

  const isLoggedIn = !!localStorage.getItem('token');
  const currentUserId = Number(localStorage.getItem('userId')) || null;

  useEffect(() => {
    const loadDetails = async () => {
      setIsLoading(true);
      setLoadError(null);

      const numericId = Number(id);
      // Storage and personal document APIs require authentication; guests only load public metadata below.
      if (isLoggedIn) {
        try {
          const [subRes, myDocsRes, sharedDocsRes] = await Promise.all([
            subscriptionService.getMySubscription().catch(() => null),
            documentService.getMyDocuments().catch(() => null),
            documentService.getSharedWithMeDocuments().catch(() => null),
          ]);

          let limitGb = 2;
          if (subRes?.data?.success && subRes.data.data.status === 'ACTIVE') {
            limitGb = subRes.data.data.storageLimitGb;
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

          // Chá»‰ Ä‘Ã¡nh dáº¥u Ä‘Ã£ Ä‘á»c sau khi backend xÃ¡c nháº­n tÃ i liá»‡u thá»±c sá»± Ä‘Æ°á»£c share cho user hiá»‡n táº¡i.
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
            shareApprovalStatus: doc.shareApprovalStatus,
          });
          setIsLoading(false);
          return;
        }

        if (!isLoggedIn) {
          setDocumentDetails(null);
          setLoadError('This public document is no longer available.');
          setIsLoading(false);
          return;
        }
      }

      setDocumentDetails(null);
      setLoadError('This document could not be found or you do not have access to it.');
      setIsLoading(false);
    };

    loadDetails();
  }, [id, isLoggedIn, navigate, currentUserId]);

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
        const updatedDocument = response.data.data;
        setDocumentDetails((prev) => (prev ? {
          ...prev,
          isPublic: updatedDocument.isPublic,
          shareApprovalStatus: updatedDocument.shareApprovalStatus,
        } : null));
        alert(nextPublicState
          ? 'Public sharing request submitted. The document will appear in Community after admin approval.'
          : 'Document is now Private.');
      } else {
        alert(response.error || 'Failed to update document visibility.');
      }
    } catch {
      alert('An error occurred while updating document visibility.');
    }
  };

  const handleTabChange = (tabName: string) => {
    if (tabName !== 'AI Assistant' && tabName !== 'Settings') {
      navigate('/dashboard', { state: { activeTab: tabName } });
    }
  };

  const canUseChat = isLoggedIn;

  if (isLoading || !documentDetails) {
    return (
      <DashboardLayout activeTab={fromTab} onTabChange={handleTabChange} fluid={true} storage={storage}>
        <div className="flex-1 flex flex-col items-center justify-center py-40 gap-3 w-full bg-surface">
          {loadError ? (
            <>
              <span className="material-symbols-outlined text-[44px] text-secondary select-none">error</span>
              <span className="font-body-md text-secondary select-none">{loadError}</span>
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
              alert('Sharing is not available for this document.');
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
            navigate('/dashboard', {
              state: {
                activeTab: fromTab,
                folderId: fromFolderId,
                folderName: fromFolderName,
              },
            });
          }}
          isChatOpen={isChatOpen && canUseChat}
          onToggleChat={canUseChat ? () => setIsChatOpen(!isChatOpen) : undefined}
        />

        {isChatOpen && canUseChat && (
          <ChatErrorBoundary onClose={() => setIsChatOpen(false)}>
            <DocumentChat
              documentId={documentDetails.id}
              fileName={documentDetails.name}
              status={documentDetails.status}
              onClose={() => setIsChatOpen(false)}
            />
          </ChatErrorBoundary>
        )}
      </div>

      {documentDetails?.id && (
        <>
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            documentId={documentDetails.id}
            documentName={documentDetails.name}
            isInitiallyPublic={documentDetails.isPublic || false}
            initialApprovalStatus={documentDetails.shareApprovalStatus}
            onApprovalStatusChange={(shareApprovalStatus) => {
              setDocumentDetails((prev) => (prev ? { ...prev, shareApprovalStatus } : null));
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
