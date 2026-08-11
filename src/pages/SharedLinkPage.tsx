import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DocumentPreview from '../components/document/DocumentPreview';
import { documentService } from '../services/documentService';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const SharedLinkPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  const [documentDetails, setDocumentDetails] = useState<{
    id: number;
    name: string;
    size: string;
    lastModified: string;
    previewUrl: string | null;
    downloadUrl: string | null;
    contentType: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setIsSaved(false);
    setSaveError(null);

    if (!token) {
      setErrorMsg('No sharing token provided.');
      setIsLoading(false);
      return;
    }

    const loadSharedDocument = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        // Fetch metadata public API
        const detailResponse = await documentService.getSharedDocumentByLink(token);
        
        if (detailResponse.data && detailResponse.data.success) {
          const doc = detailResponse.data.data;
          
          // Fetch preview URL public API
          let previewUrl: string | null = null;
          let contentType = doc.contentType;
          try {
            const previewResponse = await documentService.getSharedDocumentPreviewUrlByLink(token);
            if (previewResponse.data && previewResponse.data.success) {
              previewUrl = previewResponse.data.data.url;
              if (previewResponse.data.data.contentType) {
                contentType = previewResponse.data.data.contentType;
              }
            }
          } catch (e) {
            console.error('Failed to load shared preview URL:', e);
          }

          // Fetch download URL public API
          let downloadUrl: string | null = null;
          try {
            const downloadResponse = await documentService.getSharedDocumentDownloadUrlByLink(token);
            if (downloadResponse.data && downloadResponse.data.success) {
              downloadUrl = downloadResponse.data.data.url;
            }
          } catch (e) {
            console.error('Failed to load shared download URL:', e);
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
          });
        } else {
          setErrorMsg(detailResponse.error || 'This shared document link is invalid or has expired.');
        }
      } catch (err) {
        console.error('Error fetching shared document details:', err);
        setErrorMsg('An error occurred while loading the shared document. Please verify the link.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedDocument();
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDownload = () => {
    if (documentDetails?.downloadUrl) {
      window.open(documentDetails.downloadUrl, '_blank');
    } else {
      alert('Download link is not available.');
    }
  };

  const handleSaveToShared = async () => {
    if (!token) {
      setSaveError('The sharing token is missing.');
      return;
    }

    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await documentService.saveShareLinkToSharedWithMe(token);
      if (response.data?.success) {
        setIsSaved(true);
      } else {
        setSaveError(response.error || 'Failed to save this document.');
      }
    } catch (error) {
      console.error('Failed to save shared document:', error);
      setSaveError('Failed to save this document.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-3 bg-surface select-none">
        <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="font-body-md text-secondary">Loading shared document...</span>
      </div>
    );
  }

  if (errorMsg || !documentDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface p-6 text-center select-none animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-error-container/20 border border-error/20 flex items-center justify-center text-error mb-4">
          <span className="material-symbols-outlined text-[36px]">link_off</span>
        </div>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">
          Document Unavailable
        </h2>
        <p className="text-secondary text-body-md max-w-md mb-6">
          {errorMsg || 'The share link is inactive, expired, or the owner has disabled link sharing.'}
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/90 font-bold rounded-lg transition-all shadow-md shadow-primary/10 cursor-pointer"
        >
          Go to AetherDocs
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-container-lowest">
      {/* Brand Header */}
      <header className="h-14 bg-surface border-b border-surface-variant flex items-center justify-between px-6 select-none shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined icon-fill select-none text-[18px]">cloud_sync</span>
          </div>
          <div>
            <h1 className="font-bold text-sm text-on-surface">AetherDocs</h1>
            <p className="text-[10px] text-secondary">Shared Document View</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <button
              onClick={handleSaveToShared}
              disabled={isSaving || isSaved}
              title="Save this shared document to your Shared files"
              className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:cursor-default disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isSaved ? 'bookmark' : 'bookmark_add'}
              </span>
              {isSaving ? 'Saving...' : isSaved ? 'Saved to Shared' : 'Save to Shared'}
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-xs text-primary font-bold hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Sign In / Register
            </button>
          )}
        </div>
      </header>

      {saveError && (
        <div className="absolute top-16 right-6 z-20 rounded-lg border border-error/20 bg-error-container/90 px-3 py-2 text-xs text-on-error-container shadow-md">
          {saveError}
        </div>
      )}

      {/* Main Preview Container */}
      <div className="flex-1 overflow-hidden h-full w-full">
        <DocumentPreview
          fileName={documentDetails.name}
          fileSize={documentDetails.size}
          lastModified={documentDetails.lastModified}
          previewUrl={documentDetails.previewUrl}
          downloadUrl={documentDetails.downloadUrl}
          contentType={documentDetails.contentType}
          onDownloadClick={handleDownload}
          isChatOpen={false}
        />
      </div>
    </div>
  );
};

export default SharedLinkPage;
