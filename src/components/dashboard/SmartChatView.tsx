import React, { useEffect, useMemo, useState } from 'react';
import DocumentChat from '../document/DocumentChat';
import ChatErrorBoundary from '../document/ChatErrorBoundary';
import { documentService } from '../../services/documentService';
import type { DocumentUploadResponse } from '../../services/documentService';
import subscriptionService from '../../services/subscriptionService';

export const SmartChatView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentUploadResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeIds, setActiveIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [canChatMultiple, setCanChatMultiple] = useState(false);
  const [planName, setPlanName] = useState('Free');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([documentService.getMyDocuments(), subscriptionService.getMySubscription()])
      .then(([documentsResponse, subscriptionResponse]) => {
        if (documentsResponse.data?.success) {
          setDocuments(documentsResponse.data.data.filter((document) => document.status === 'READY' && !document.isDeleted));
        } else {
          setError(documentsResponse.error || 'Could not load your documents.');
        }
        if (subscriptionResponse.data?.success && subscriptionResponse.data.data.status === 'ACTIVE') {
          setCanChatMultiple(subscriptionResponse.data.data.multipleDocuments);
          setPlanName(subscriptionResponse.data.data.planName || 'Free');
        } else {
          setError(subscriptionResponse.error || 'No active subscription is available for Smart Chat.');
        }
      })
      .catch(() => setError('Could not prepare Smart Chat. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredDocuments = useMemo(() => documents.filter((document) =>
    document.originalFileName.toLowerCase().includes(search.toLowerCase()),
  ), [documents, search]);

  const toggleDocument = (id: number) => {
    setError(null);
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (!canChatMultiple && current.length >= 1) {
        setError(`${planName} supports one document per chat. Choose a plan with multi-document access to compare documents.`);
        return current;
      }
      return [...current, id];
    });
  };

  const selectedDocuments = documents.filter((document) => activeIds.includes(document.documentId));
  const activeTitle = selectedDocuments.length === 1
    ? selectedDocuments[0].originalFileName
    : `${selectedDocuments.length} selected documents`;

  if (activeIds.length > 0) {
    const isMulti = activeIds.length > 1;
    return (
      <div className="h-[calc(100vh-140px)] min-h-[520px] overflow-hidden rounded-lg border border-outline-variant bg-surface">
        <div className="flex h-12 items-center gap-2 border-b border-outline-variant px-3">
          <button type="button" onClick={() => setActiveIds([])} className="grid h-8 w-8 place-items-center rounded-lg text-secondary hover:bg-surface-container" title="Choose different documents"><span className="material-symbols-outlined text-[19px]">arrow_back</span></button>
          <span className="text-xs text-secondary">Smart Chat workspace</span>
        </div>
        <div className="h-[calc(100%-3rem)] [&>section]:!w-full">
          <ChatErrorBoundary onClose={() => setActiveIds([])}>
            <DocumentChat
              documentId={!isMulti ? activeIds[0] : null}
              fileName={!isMulti ? activeTitle : ''}
              status="READY"
              isFolderMode={isMulti}
              folderId={null}
              folderName={activeTitle}
              documentIds={activeIds}
              documents={selectedDocuments.map((document) => ({ documentId: document.documentId, originalFileName: document.originalFileName }))}
            />
          </ChatErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-[calc(100vh-140px)] rounded-lg border border-outline-variant bg-surface p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-3 border-b border-outline-variant pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">Smart Chat</p>
            <h2 className="mt-1 text-2xl font-bold text-on-surface">Choose what AI can use</h2>
            <p className="mt-1 max-w-2xl text-sm text-secondary">Select ready documents before starting. Docentra AI will answer only from that scope, so its sources stay relevant and easier to verify.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface"><span className="material-symbols-outlined text-[16px] text-primary">workspace_premium</span>{planName}</span>
        </header>

        {!canChatMultiple && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-tertiary/30 bg-tertiary-fixed/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3"><span className="material-symbols-outlined text-tertiary">info</span><div><p className="text-sm font-semibold text-on-surface">Your plan supports one document per chat</p><p className="mt-0.5 text-xs text-secondary">Multi-document chat lets you compare, summarize, and find connections across several files.</p></div></div>
            <button type="button" onClick={() => window.dispatchEvent(new Event('open-subscription-plans'))} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary"><span className="material-symbols-outlined text-[17px]">workspace_premium</span>Compare plans</button>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block flex-1 sm:max-w-md"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-secondary">search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your ready documents" className="h-11 w-full rounded-lg border border-outline-variant bg-surface pl-10 pr-3 text-sm outline-none focus:border-primary" /></label>
          <p className="text-xs text-secondary">{selectedIds.length} selected · {documents.length} ready</p>
        </div>

        {error && <div className="mt-3 flex items-center gap-2 rounded-lg border border-error/30 bg-error-container/30 px-3 py-2 text-xs text-error" role="alert"><span className="material-symbols-outlined text-[17px]">error</span>{error}</div>}

        <div className="mt-4 overflow-hidden rounded-lg border border-outline-variant">
          {loading ? <p className="p-10 text-center text-sm text-secondary">Loading your documents...</p> : filteredDocuments.length === 0 ? <div className="p-10 text-center"><span className="material-symbols-outlined text-[34px] text-secondary">description</span><p className="mt-2 text-sm font-semibold text-on-surface">No ready documents found</p><p className="mt-1 text-xs text-secondary">Upload a document or wait for processing to finish.</p></div> : filteredDocuments.map((document) => {
            const selected = selectedIds.includes(document.documentId);
            return <button key={document.documentId} type="button" onClick={() => toggleDocument(document.documentId)} className={`grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-outline-variant px-4 py-3 text-left last:border-b-0 ${selected ? 'bg-primary-fixed/30' : 'hover:bg-surface-container-low'}`}><span className={`material-symbols-outlined ${selected ? 'text-primary' : 'text-secondary'}`}>{selected ? 'check_box' : 'check_box_outline_blank'}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-on-surface">{document.originalFileName}</span><span className="mt-0.5 block text-xs text-secondary">Ready for AI · {(document.fileSize / 1024 / 1024).toFixed(1)} MB</span></span><span className="hidden text-xs text-secondary sm:block">{new Date(document.uploadedAt).toLocaleDateString()}</span></button>;
          })}
        </div>

        <div className="sticky bottom-4 mt-5 flex items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface/95 p-3 shadow-lg">
          <p className="min-w-0 text-xs text-secondary">{selectedIds.length === 0 ? 'Select at least one document to continue.' : selectedIds.length === 1 ? 'Start a focused chat with one document.' : `AI will search across ${selectedIds.length} documents.`}</p>
          <button type="button" disabled={selectedIds.length === 0} onClick={() => setActiveIds(selectedIds)} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-40"><span className="material-symbols-outlined text-[18px]">forum</span>Start chat</button>
        </div>
      </div>
    </section>
  );
};

export default SmartChatView;
