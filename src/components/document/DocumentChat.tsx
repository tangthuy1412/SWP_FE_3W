import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatService } from '../../services/chatService';
import type { ChatMessageFromBackend, ChatSession } from '../../services/chatService';
import subscriptionService from '../../services/subscriptionService';

export interface DocumentChatProps {
  documentId?: number | null;
  fileName?: string;
  status?: string;
  onClose?: () => void;
  isFolderMode?: boolean;
  folderId?: number | null;
  folderName?: string;
  documentIds?: number[];
  documents?: { documentId: number; originalFileName: string }[];
}

const EMPTY_DOCUMENT_IDS: number[] = [];

const readMessages = (value: unknown): ChatMessageFromBackend[] => {
  if (!value || typeof value !== 'object') return [];
  const payload = value as { messages?: unknown };
  if (!Array.isArray(payload.messages)) return [];
  return payload.messages.filter((message): message is ChatMessageFromBackend => (
    !!message &&
    typeof message === 'object' &&
    typeof (message as ChatMessageFromBackend).messageId === 'number' &&
    typeof (message as ChatMessageFromBackend).content === 'string'
  ));
};

export const DocumentChat: React.FC<DocumentChatProps> = ({
  documentId = null,
  fileName = '',
  status = '',
  onClose,
  isFolderMode = false,
  folderId = null,
  folderName = '',
  documentIds = EMPTY_DOCUMENT_IDS,
}) => {
  const documentIdsKey = documentIds.join(',');
  const scope = isFolderMode
    ? folderId !== null ? `folder_${folderId}` : `documents_${[...documentIds].sort((a, b) => a - b).join('_')}`
    : `document_${documentId}`;
  const title = isFolderMode ? folderName || 'Selected documents' : fileName;
  const selectedIds = useMemo(
    () => isFolderMode ? documentIds : documentId === null ? [] : [documentId],
    // The key keeps folder selections stable when the parent recreates an equivalent array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentId, documentIdsKey, isFolderMode],
  );
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [scopeSessions, setScopeSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessageFromBackend[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planName, setPlanName] = useState('Free');
  const [canChatMultiple, setCanChatMultiple] = useState(false);
  const [tokenLimit, setTokenLimit] = useState(0);
  const [checkingPlan, setCheckingPlan] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const documentReady = isFolderMode ? selectedIds.length > 0 : status === 'READY';
  const planAllowsChat = !isFolderMode || canChatMultiple;
  const canSend = documentReady && planAllowsChat && tokenLimit > 0;

  useEffect(() => {
    subscriptionService.getMySubscription().then((response) => {
      if (response.data?.success) {
        setPlanName(response.data.data.planName || 'Free');
        setCanChatMultiple(response.data.data.multipleDocuments);
        setTokenLimit(response.data.data.monthlyTokenLimit || 0);
      }
    }).catch(() => setError('Could not verify your plan. Please try again.'))
      .finally(() => setCheckingPlan(false));
  }, []);

  useEffect(() => {
    if (checkingPlan || !canSend) return;
    let cancelled = false;

    const sameDocuments = (left: number[] | null, right: number[]) => {
      if (!left || left.length !== right.length) return false;
      const expected = new Set(right);
      return left.every((id) => expected.has(id));
    };

    const initializeSession = async () => {
      setLoadingHistory(true);
      setError(null);
      // A scope change clears the previous scope before the asynchronous history load.
      setMessages([]);
      try {
        const sessionsResponse = await chatService.getSessions();
        if (!sessionsResponse.data?.success || !Array.isArray(sessionsResponse.data.data)) {
          throw new Error(sessionsResponse.error || 'Could not load chat sessions.');
        }

        const matchingSessions = sessionsResponse.data.data
          .filter((session) =>
            session.mode === 'SELECTED_DOCUMENTS' &&
            (folderId !== null ? session.folderId === folderId : sameDocuments(session.selectedDocumentIds, selectedIds)),
          )
          .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
        if (!cancelled) setScopeSessions(matchingSessions);
        const matched = matchingSessions[0];

        let id = matched?.sessionId ?? null;
        let newlyCreatedSession: ChatSession | null = null;
        if (id === null) {
          const createResponse = await chatService.createSession({
            title: `Chat: ${title}`,
            mode: 'SelectedDocuments',
            selectedDocumentIds: selectedIds,
            folderId: isFolderMode ? folderId : null,
            useGeneralKnowledge: false,
          });
          if (!createResponse.data?.success || !createResponse.data.data?.sessionId) {
            throw new Error(createResponse.error || 'Could not create a chat session.');
          }
          newlyCreatedSession = createResponse.data.data;
          if (!sameDocuments(newlyCreatedSession.selectedDocumentIds, selectedIds)) {
            throw new Error(
              `The chat session includes ${newlyCreatedSession.selectedDocumentIds?.length || 0} of ${selectedIds.length} selected documents. The server must preserve every selectedDocumentId for multi-document chat.`,
            );
          }
          id = newlyCreatedSession.sessionId;
          if (!cancelled) {
            setSessionId(id);
            setMessages([]);
            setScopeSessions((current) => [newlyCreatedSession!, ...current]);
          }
        }

        // A brand-new session has no history. Avoid an immediate read that can race backend persistence.
        if (newlyCreatedSession) return;

        const historyResponse = await chatService.getSessionMessages(id);
        if (historyResponse.status === 404) {
          const replacementResponse = await chatService.createSession({
            title: `Chat: ${title}`,
            mode: 'SelectedDocuments',
            selectedDocumentIds: selectedIds,
            folderId: isFolderMode ? folderId : null,
            useGeneralKnowledge: false,
          });
          if (!replacementResponse.data?.success) {
            throw new Error(replacementResponse.error || 'Could not replace the missing chat session.');
          }
          if (!sameDocuments(replacementResponse.data.data.selectedDocumentIds, selectedIds)) {
            throw new Error(
              `The replacement session includes ${replacementResponse.data.data.selectedDocumentIds?.length || 0} of ${selectedIds.length} selected documents.`,
            );
          }
          if (!cancelled) {
            setSessionId(replacementResponse.data.data.sessionId);
            setMessages([]);
            setScopeSessions((current) => [replacementResponse.data!.data, ...current.filter((session) => session.sessionId !== id)]);
          }
          return;
        }
        if (!historyResponse.data?.success) {
          throw new Error(historyResponse.error || 'Could not load conversation messages.');
        }
        if (!cancelled) {
          setSessionId(id);
          setMessages(readMessages(historyResponse.data.data).sort((a, b) => a.messageId - b.messageId));
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not initialize AI chat.');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    initializeSession();
    return () => { cancelled = true; };
  }, [canSend, checkingPlan, folderId, isFolderMode, scope, selectedIds, title]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const openSession = async (id: number) => {
    if (id === sessionId || loading || loadingHistory) return;
    setLoadingHistory(true);
    setError(null);
    const response = await chatService.getSessionMessages(id);
    if (response.data?.success) {
      setSessionId(id);
      setMessages(readMessages(response.data.data).sort((a, b) => a.messageId - b.messageId));
    } else {
      setError(response.error || 'Could not load this conversation.');
    }
    setLoadingHistory(false);
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading || loadingHistory || !canSend || sessionId === null) return;
    setInput('');
    setError(null);
    setLoading(true);
    const optimistic: ChatMessageFromBackend = {
      messageId: -Date.now(), role: 'USER', content: question, status: 'COMPLETED', createdAt: new Date().toISOString(), sources: [],
    };
    setMessages((current) => [...current, optimistic]);
    try {
      const response = await chatService.sendMessageToSession(sessionId, question);
      if (!response.data?.success) throw new Error(response.error || 'AI could not answer this question.');
      const answer = response.data.data;
      if (!answer || typeof answer.content !== 'string') {
        throw new Error('The AI service returned an invalid message. Please try again.');
      }
      setMessages((current) => [...current, answer]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong while sending your message.');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    setLoadingHistory(true);
    setError(null);
    const response = await chatService.createSession({
      title: `Chat: ${title}`,
      mode: 'SelectedDocuments',
      selectedDocumentIds: selectedIds,
      folderId: isFolderMode ? folderId : null,
      useGeneralKnowledge: false,
    });
    if (response.data?.success) {
      const returnedIds = response.data.data.selectedDocumentIds;
      const expectedIds = new Set(selectedIds);
      if (!returnedIds || returnedIds.length !== selectedIds.length || !returnedIds.every((id) => expectedIds.has(id))) {
        setError(`The server created this session with ${returnedIds?.length || 0} of ${selectedIds.length} selected documents.`);
        setLoadingHistory(false);
        return;
      }
      setSessionId(response.data.data.sessionId);
      setScopeSessions((current) => [response.data!.data, ...current]);
      setMessages([]);
    } else {
      setError(response.error || 'Could not create a new chat.');
    }
    setLoadingHistory(false);
  };

  return (
    <section className="flex h-full min-h-0 w-full shrink-0 flex-col bg-surface lg:w-[430px]" aria-label={`AI chat for ${title}`}>
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate">{isFolderMode ? 'Chat with multiple documents' : 'Chat with this document'}</p>
          <p className="text-xs text-secondary truncate">{title}{isFolderMode ? ` · ${selectedIds.length} ready files` : ''}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={startNewChat} disabled={loadingHistory || !canSend} className="grid h-9 w-9 place-items-center rounded-lg text-secondary hover:bg-surface-container disabled:opacity-40" title="Start new chat"><span className="material-symbols-outlined text-[19px]">add_comment</span></button>
          {onClose && <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-secondary hover:bg-surface-container" title="Close chat"><span className="material-symbols-outlined text-[19px]">close</span></button>}
        </div>
      </header>

      {scopeSessions.length > 1 && (
        <div className="border-b border-outline-variant bg-surface-container-low px-4 py-2">
          <label className="flex items-center gap-2 text-xs text-secondary">
            <span className="material-symbols-outlined text-[17px]">history</span>
            <span className="shrink-0">Conversation</span>
            <select value={sessionId ?? ''} onChange={(event) => openSession(Number(event.target.value))} disabled={loadingHistory || loading} className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-xs text-on-surface outline-none focus:border-primary">
              {scopeSessions.map((session, index) => <option key={session.sessionId} value={session.sessionId}>{index === 0 ? 'Latest: ' : ''}{session.title || `Chat ${session.sessionId}`} · {new Date(session.updatedAt).toLocaleString()}</option>)}
            </select>
          </label>
        </div>
      )}

      {checkingPlan ? (
        <div className="m-4 flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-secondary">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          Checking AI access for your plan...
        </div>
      ) : !planAllowsChat || tokenLimit <= 0 ? (
        <div className="m-4 rounded-lg border border-tertiary/30 bg-tertiary-fixed/20 p-4">
          <div className="flex gap-3"><span className="material-symbols-outlined text-tertiary">lock</span><div><p className="text-sm font-semibold text-on-surface">{isFolderMode ? 'Multi-document chat is not included in your plan' : 'AI chat is not included in your plan'}</p><p className="mt-1 text-xs text-secondary">Your {planName} plan {isFolderMode ? 'supports chat with one document at a time.' : 'does not include monthly AI tokens.'}</p></div></div>
          <button type="button" onClick={() => window.dispatchEvent(new Event('open-subscription-plans'))} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary"><span className="material-symbols-outlined text-[17px]">upgrade</span>View plans</button>
        </div>
      ) : !documentReady ? (
        <div className="m-4 flex gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-secondary"><span className="material-symbols-outlined">hourglass_top</span>{isFolderMode ? 'This folder has no documents ready for AI yet.' : 'This document is still being processed. Chat will be available when it is ready.'}</div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {loadingHistory ? <p className="text-center text-sm text-secondary">Loading conversation...</p> : messages.length === 0 && canSend ? (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center"><span className="material-symbols-outlined mb-3 text-[36px] text-primary">forum</span><h3 className="font-semibold text-on-surface">Ask about {isFolderMode ? 'these documents' : 'this document'}</h3><p className="mt-1 text-sm text-secondary">Try asking for a summary, key points, comparisons, or specific facts.</p></div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">{messages.map((message) => <article key={`${message.messageId}-${message.createdAt}`} className={`flex ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 ${message.role === 'USER' ? 'bg-primary text-on-primary' : 'border border-outline-variant bg-surface-container-low text-on-surface'}`}><ReactMarkdown>{message.content || ''}</ReactMarkdown>{Array.isArray(message.sources) && message.sources.length > 0 && <p className="mt-2 border-t border-outline-variant pt-2 text-[11px] text-secondary">{message.sources.length} source {message.sources.length === 1 ? 'reference' : 'references'}</p>}</div></article>)}</div>
        )}
        {loading && <p className="mx-auto mt-4 max-w-3xl text-sm text-secondary">Aether AI is reviewing your documents...</p>}
        <div ref={endRef} />
      </div>

      <footer className="border-t border-outline-variant bg-surface p-3 md:p-4">
        {error && <p className="mb-2 text-xs text-error" role="alert">{error}</p>}
        <form onSubmit={sendMessage} className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-2 focus-within:border-primary">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} disabled={!canSend || loading || loadingHistory || sessionId === null} placeholder={loadingHistory || sessionId === null ? 'Preparing conversation...' : canSend ? `Ask about ${isFolderMode ? `${selectedIds.length} documents` : fileName}...` : 'Chat is unavailable'} className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none disabled:cursor-not-allowed" />
          <button type="submit" disabled={!canSend || loading || loadingHistory || sessionId === null || !input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-on-primary disabled:opacity-40" title="Send message"><span className="material-symbols-outlined text-[19px]">arrow_upward</span></button>
        </form>
        <p className="mt-2 text-center text-[10px] text-secondary">Answers are generated from the selected documents and may contain mistakes.</p>
      </footer>
    </section>
  );
};

export default DocumentChat;
