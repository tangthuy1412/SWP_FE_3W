/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatService } from '../../services/chatService';
import { documentService } from '../../services/documentService';
import { useConfirm } from '../../contexts/ConfirmContext';
import type { ChatSession, MessageSource } from '../../services/chatService';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  senderName: string;
  avatar: string;
  sources?: MessageSource[];
  citation?: string;
}

export const SmartChatView: React.FC = () => {
  const confirmAction = useConfirm();
  // Read config from localStorage
  const includePublic = localStorage.getItem('smartChatIncludePublic') !== 'false';
  const activeModel = localStorage.getItem('smartChatModel') || 'gemini-2.5-flash-lite';
  const savedTemp = localStorage.getItem('smartChatTemperature');
  const activeTemperature = savedTemp ? parseFloat(savedTemp) : 0.2;

  // Session list states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Active chat states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Inline editing title states
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Document ID to originalFileName map for citation resolution
  const [documentNamesMap, setDocumentNamesMap] = useState<Record<number, string>>({});

  const userAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuBPOtHdkK3q1RuRa0eWcRdWrXzjGxNBb9CAYqiXL5iBvNhQZQKl7G0RGvQ79sGLRsIPXdXqVkDlXJqkt0UPTXJalUAP6p4RkSEjwYJ8H9iKPvuxItA4WRqbxBCNFbvShzoA909VlVFgtS8fL4dwS6fFkEFZzxHenm3dB1rqCqYPAgBhPHIkmjO0p_oSBgm0_2tiaaN_2CMEkV3a9xGXRPmwKn5fhRh9vsfU5eo4hGgX0RswA9Mpg5hf81M-6Ig3sUttXhMJjEOtPLvr";

  // Auto-scroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiLoading]);

  // Load document names on mount
  useEffect(() => {
    const fetchDocsForCitations = async () => {
      try {
        const map: Record<number, string> = {};
        const [myDocs, publicDocs] = await Promise.all([
          documentService.getMyDocuments(),
          documentService.getPublicDocuments()
        ]);

        if (myDocs.data && myDocs.data.success) {
          myDocs.data.data.forEach((doc) => {
            map[doc.documentId] = doc.originalFileName;
          });
        }
        if (publicDocs.data && publicDocs.data.success) {
          publicDocs.data.data.forEach((doc) => {
            map[doc.documentId] = doc.originalFileName;
          });
        }
        setDocumentNamesMap(map);
      } catch (err) {
        console.error('Failed to load documents for citation mapping:', err);
      }
    };
    fetchDocsForCitations();
  }, []);

  // Create a new session (Clears active session to wait for first question)
  const handleCreateNewSession = () => {
    setActiveSessionId(null);
  };

  // Fetch all chat sessions on mount
  const fetchSessions = async (selectLatest = true) => {
    setIsLoadingSessions(true);
    try {
      const response = await chatService.getSessions();
      if (response.data && response.data.success) {
        // Filter sessions with mode === 'USER_STORAGE' only
        const list = response.data.data.filter((s) => s.mode === 'USER_STORAGE');
        setSessions(list);

        // Select the most recent session if requested
        if (selectLatest && list.length > 0) {
          setActiveSessionId(list[0].sessionId);
        } else {
          setActiveSessionId(null);
        }
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions(false);
  }, []);

  // Load messages when activeSessionId changes
  useEffect(() => {
    if (activeSessionId === null) {
      setMessages([]);
      return;
    }

    if (isAiLoading) return;

    const loadMessages = async () => {
      try {
        const response = await chatService.getSessionMessages(activeSessionId);
        if (response.data && response.data.success) {
          const rawMsgs = response.data.data.messages;

          // Convert backend format to frontend format (reverse chronological or chronological depending on API)
          // The API contract shows messages ordered chronologically or with timestamp. Let's sort them by messageId or createdAt just in case.
          const sorted = [...rawMsgs].sort((a, b) => a.messageId - b.messageId);

          const formatted = sorted.map((msg): ChatMessage => {
            const isAi = msg.role === 'ASSISTANT';
            return {
              id: `msg-backend-${msg.messageId}`,
              sender: isAi ? 'ai' : 'user',
              senderName: isAi ? 'Aether AI' : 'You',
              avatar: isAi ? 'smart_toy' : userAvatar,
              text: msg.content,
              sources: msg.sources,
            };
          });

          setMessages(formatted);
        }
      } catch (err) {
        console.error('Failed to load session messages:', err);
      }
    };

    loadMessages();
  }, [activeSessionId, sessions, isAiLoading]);



  // Rename session
  const handleRenameSubmit = async (sessionId: number) => {
    if (!editingTitle.trim()) {
      setEditingSessionId(null);
      return;
    }

    try {
      const response = await chatService.renameSession(sessionId, editingTitle.trim());
      if (response.data && response.data.success) {
        const newTitle = response.data.data.title;
        setSessions((prev) =>
          prev.map((s) =>
            s.sessionId === sessionId ? { ...s, title: newTitle } : s
          )
        );
      }
    } catch (err) {
      console.error('Failed to rename session:', err);
    } finally {
      setEditingSessionId(null);
    }
  };

  // Delete session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();
    const confirmDelete = await confirmAction({ title: 'Delete chat session?', message: 'Are you sure you want to delete this chat session?', confirmLabel: 'Delete' });
    if (!confirmDelete) return;

    try {
      const response = await chatService.deleteSession(sessionId);
      if (response.data && response.data.success) {
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        if (activeSessionId === sessionId) {
          // Select another session if available
          const remaining = sessions.filter((s) => s.sessionId !== sessionId);
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].sessionId);
          } else {
            setActiveSessionId(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isAiLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      senderName: 'You',
      avatar: userAvatar,
      text: inputVal,
    };

    setMessages((prev) => [...prev, userMessage]);
    const query = inputVal.trim();
    setInputVal('');
    setIsAiLoading(true);

    try {
      let currentSessionId = activeSessionId;

      if (currentSessionId === null) {
        const createRes = await chatService.createSession({
          title: query.length > 40 ? `${query.slice(0, 40)}...` : query,
          mode: 'UserStorage',
          selectedDocumentIds: null,
          folderId: null,
          useGeneralKnowledge: includePublic,
          model: activeModel,
          temperature: activeTemperature,
        });

        if (createRes.data && createRes.data.success) {
          const newSessionObj = createRes.data.data;
          setSessions((prev) => [newSessionObj, ...prev]);
          currentSessionId = newSessionObj.sessionId;
          setActiveSessionId(currentSessionId);
        } else {
          throw new Error('Failed to create session');
        }
      }

      const response = await chatService.sendMessageToSession(
        currentSessionId,
        query,
        activeModel,
        includePublic,
        activeTemperature
      );

      if (response.data && response.data.success) {
        const data = response.data.data;
        setSessions((prev) =>
          prev.map((session) =>
            session.sessionId === currentSessionId
              ? {
                  ...session,
                  model: activeModel,
                  temperature: activeTemperature,
                  policy: includePublic
                    ? 'DOCUMENTS_PLUS_GENERAL'
                    : 'DOCUMENTS_ONLY',
                }
              : session
          )
        );

        const aiResponse: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai',
          senderName: 'Aether AI',
          avatar: 'smart_toy',
          text: data.content,
          sources: data.sources?.length > 0 ? data.sources : undefined,
        };
        setMessages((prev) => [...prev, aiResponse]);
      } else {
        const errorMsg = response.error || 'Failed to retrieve AI answer.';
        const aiResponse: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai',
          senderName: 'Aether AI',
          avatar: 'smart_toy',
          text: `Error: ${errorMsg}`,
        };
        setMessages((prev) => [...prev, aiResponse]);
      }
    } catch (err) {
      console.error('Error sending message to session:', err);
      const aiResponse: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        senderName: 'Aether AI',
        avatar: 'smart_toy',
        text: 'An unexpected error occurred while querying the AI Smart Chat session.',
      };
      setMessages((prev) => [...prev, aiResponse]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCitationClick = (sources: MessageSource[]) => {
    const names = sources.map((s) => documentNamesMap[s.documentId] || `Doc ID ${s.documentId}`);
    alert(`Source documents for this response:\n\n${names.map((name, i) => `${i + 1}. ${name}`).join('\n')}`);
  };

  const activeSessionObj = sessions.find((s) => s.sessionId === activeSessionId);
  const isEmptyChat = messages.length === 0 && !isAiLoading;

  return (
    <div className="bg-surface rounded-2xl border border-surface-variant flex flex-col md:flex-row h-[calc(100vh-140px)] min-h-[500px] overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
      
      {/* LEFT PANEL: Chat history sessions list */}
      {isSidebarOpen && (
      <div className="w-full md:w-64 shrink-0 bg-surface-container-low border-b md:border-b-0 md:border-r border-surface-variant/40 flex flex-col h-1/3 md:h-full select-none">
        <div className="p-3 border-b border-surface-variant/40 flex items-center gap-2">
          <button
            onClick={handleCreateNewSession}
            className="min-w-0 flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="text-label-md">New Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Close chat history"
            aria-label="Close chat history"
          >
            <span className="material-symbols-outlined text-[20px]">left_panel_close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {isLoadingSessions && sessions.length === 0 ? (
            <div className="p-4 text-center text-secondary text-label-md">Loading chats...</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-secondary text-label-md">No chats yet</div>
          ) : (
            sessions.map((session) => {
              const isActive = session.sessionId === activeSessionId;
              const isEditing = session.sessionId === editingSessionId;

              return (
                <div
                  key={session.sessionId}
                  onClick={() => !isEditing && setActiveSessionId(session.sessionId)}
                  className={`group flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary-fixed/20 text-primary border-l-4 border-primary font-bold'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className={`material-symbols-outlined text-[18px] shrink-0 ${isActive ? 'text-primary' : 'text-secondary'}`}>
                      chat_bubble
                    </span>
                    
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleRenameSubmit(session.sessionId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(session.sessionId);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        autoFocus
                        className="bg-surface border border-primary px-1.5 py-0.5 rounded text-body-sm w-full outline-none"
                      />
                    ) : (
                      <span className="text-body-sm truncate pr-2">{session.title}</span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.sessionId);
                          setEditingTitle(session.title);
                        }}
                        className="p-1 text-secondary hover:text-primary rounded hover:bg-surface-container"
                        title="Rename Chat"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(e, session.sessionId)}
                        className="p-1 text-secondary hover:text-error rounded hover:bg-error/10"
                        title="Delete Chat"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* RIGHT PANEL: Active chat session interface */}
      <div className="flex-1 flex flex-col min-w-0 h-2/3 md:h-full relative bg-surface-container-lowest/10">
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-30 w-9 h-9 flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-secondary hover:text-on-surface hover:bg-surface-container transition-colors shadow-sm cursor-pointer"
            title="Open chat history"
            aria-label="Open chat history"
          >
            <span className="material-symbols-outlined text-[20px]">left_panel_open</span>
          </button>
        )}
        
        {/* Header Info */}
        {!isEmptyChat && (
        <div className="h-16 border-b border-surface-variant/40 flex items-center px-6 bg-surface-bright shrink-0 shadow-sm z-20 select-none">
          <div className="flex items-center gap-2.5 text-primary min-w-0 flex-1">
            <span className="material-symbols-outlined fill shrink-0">smart_toy</span>
            <div className="min-w-0 flex-1">
              <h2 className="font-title-md text-title-md font-bold text-on-surface truncate">
                {activeSessionObj?.title || 'Smart Chat'}
              </h2>
              <p className="text-[11px] text-secondary font-medium flex items-center gap-2 truncate">
                <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${includePublic ? 'bg-emerald-500' : 'bg-primary'}`} />
                <span className="truncate">
                  {includePublic
                    ? 'Scope: My Files + Community (Public)'
                    : 'Scope: My Files only'}
                </span>
                <span className="text-outline shrink-0">•</span>
                <span className="truncate">Model: <code className="bg-surface-container px-1 py-0.5 rounded text-primary font-mono text-[10px]">{activeModel}</code></span>
                <span className="text-outline shrink-0">•</span>
                <span className="shrink-0">Temp: {activeTemperature}</span>
              </p>
            </div>
          </div>
        </div>
        )}

        {/* Messages area */}
        {!isEmptyChat && (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar pb-36">
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            return (
              <div key={msg.id} className={`flex gap-4 max-w-[85%] ${isAi ? '' : 'self-end flex-row-reverse'}`}>
                {/* Avatar */}
                {isAi ? (
                  <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[20px] select-none">
                      {msg.avatar}
                    </span>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-outline-variant">
                    <img src={msg.avatar} alt="User Avatar" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Message content bubble */}
                <div className={`flex flex-col gap-1.5 ${isAi ? 'items-start' : 'items-end'}`}>
                  <span className="font-label-md text-label-md text-secondary ml-1 select-none">
                    {msg.senderName}
                  </span>
                  
                  <div 
                    className={`p-4 shadow-sm text-on-surface font-body-md text-body-md markdown-content leading-relaxed ${
                      isAi
                        ? 'bg-white border rounded-2xl rounded-tl-sm border-outline-variant/60 bg-white/95 text-left'
                        : 'bg-surface-container-high rounded-2xl rounded-tr-sm whitespace-pre-line text-left'
                    }`}
                  >
                    {isAi ? (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                    
                    {/* Citations block */}
                    {isAi && msg.sources && msg.sources.length > 0 && (
                      <div 
                        onClick={() => handleCitationClick(msg.sources!)}
                        className="!hidden mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container rounded-md border border-outline-variant hover:bg-surface-variant cursor-pointer transition-colors group select-none text-left"
                      >
                        <span className="material-symbols-outlined text-[14px] text-primary group-hover:text-primary-container select-none">
                          description
                        </span>
                        <span className="font-mono-label text-mono-label text-on-surface-variant max-w-[400px] truncate">
                          Sources: {msg.sources.map((src) => documentNamesMap[src.documentId] || `Doc ID ${src.documentId}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* AI Loading state placeholder */}
          {isAiLoading && (
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 animate-pulse">
                <span className="material-symbols-outlined text-[20px] select-none">auto_awesome</span>
              </div>
              <div className="flex flex-col gap-1 items-start">
                <span className="font-label-md text-label-md text-secondary ml-1 select-none">Aether AI</span>
                <div className="bg-white border rounded-2xl rounded-tl-sm border-outline-variant/40 p-4 shadow-sm flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce delay-75" />
                  <span className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce delay-150" />
                  <span className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce delay-300" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        )}

        {/* Input Area (Sticky Bottom) */}
        <div className={isEmptyChat
          ? "flex flex-1 flex-col items-center justify-center gap-5 p-6 select-none"
          : "absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-surface via-surface to-transparent pt-8 select-none z-10 shrink-0"
        }>
          {isEmptyChat && (
            <h2 className="text-title-lg font-semibold text-on-surface text-center">
              Hôm nay bạn muốn tìm hiểu điều gì?
            </h2>
          )}
          <form onSubmit={handleSendMessage} className={`relative flex items-center bg-surface-container-lowest rounded-xl border border-outline-variant focus-within:border-primary-container focus-within:ring-4 focus-within:ring-primary-fixed transition-all shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${isEmptyChat ? 'w-full max-w-3xl' : ''}`}>
            <input
              type="text"
              className="flex-1 bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-secondary-fixed-dim py-3.5 px-4 outline-none"
              placeholder={activeSessionId === null ? "Type your first message to start a new chat..." : `Ask a question across all ${activeSessionObj?.policy === 'DOCUMENTS_PLUS_GENERAL' ? 'private and public' : 'private'} documents...`}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isAiLoading}
            />
            <button 
              type="submit"
              className="m-2 w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-on-primary-fixed-variant shadow-[0_2px_4px_rgba(160,65,0,0.2)] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              disabled={isAiLoading || !inputVal.trim()}
            >
              <span className="material-symbols-outlined text-[20px] select-none">arrow_upward</span>
            </button>
          </form>
          {!isEmptyChat && <div className="text-center mt-2.5">
            <span className="font-mono-label text-[10px] text-secondary select-none">
              Aether Smart Chat retrieves knowledge from your index. AI can make mistakes.
            </span>
          </div>}
        </div>
      </div>
    </div>
  );
};

export default SmartChatView;
