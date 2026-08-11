/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { chatService } from "../../services/chatService";
import type { ChatSession, MessageSource } from "../../services/chatService";

const userAvatar =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBPOtHdkK3q1RuRa0eWcRdWrXzjGxNBb9CAYqiXL5iBvNhQZQKl7G0RGvQ79sGLRsIPXdXqVkDlXJqkt0UPTXJalUAP6p4RkSEjwYJ8H9iKPvuxItA4WRqbxBCNFbvShzoA909VlVFgtS8fL4dwS6fFkEFZzxHenm3dB1rqCqYPAgBhPHIkmjO0p_oSBgm0_2tiaaN_2CMEkV3a9xGXRPmwKn5fhRh9vsfU5eo4hGgX0RswA9Mpg5hf81M-6Ig3sUttXhMJjEOtPLvr";

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  senderName: string;
  avatar: string;
  citation?: string;
  sources?: MessageSource[];
}

export interface DocumentChatProps {
  // Props của chế độ hỏi đáp với một tài liệu.
  documentId?: number | null;
  fileName?: string;
  status?: string;
  onClose?: () => void;

  // Props của chế độ hỏi đáp theo folder; được giữ chung component với single-document.
  isFolderMode?: boolean;
  folderId?: number | null;
  folderName?: string;
  documentIds?: number[];
  documents?: { documentId: number; originalFileName: string }[];
}

/**
 * Điều phối UI chat và hai cách gọi backend:
 * ưu tiên session persistent để lưu lịch sử, stateless chỉ dùng làm fallback.
 */
export const DocumentChat: React.FC<DocumentChatProps> = ({
  documentId = null,
  fileName = "",
  status = "",
  onClose,
  isFolderMode = false,
  folderId = null,
  folderName = "",
  documentIds = [],
  documents = [],
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (isFolderMode) {
      return [
        {
          id: "m1",
          sender: "ai",
          senderName: "Aether AI",
          avatar: "auto_awesome",
          text: `I've analyzed the folder "${folderName || "Folder"}" containing ${documentIds?.length || 0} ready documents. What would you like to know?`,
        },
      ];
    } else {
      return [
        {
          id: "m1",
          sender: "ai",
          senderName: "Aether AI",
          avatar: "auto_awesome",
          text: `I've analyzed "${fileName}". It covers enterprise expansion, AI integration, and financial targets. What would you like to know?`,
        },
      ];
    }
  });
  const [inputVal, setInputVal] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<number | null>(null);

  // UI chỉ mở ô hỏi khi document đã READY; backend vẫn kiểm tra lại quyền và trạng thái.
  const isChatReady = isFolderMode
    ? (documentIds?.length ?? 0) > 0
    : status === "READY";
  const documentIdsStr = documentIds?.join(",") || "";

  // Khi đổi document/folder, reset state rồi tìm session phù hợp với phạm vi tài liệu mới.
  useEffect(() => {
    setSessionId(null);
    setMessages([
      {
        id: "m1",
        sender: "ai",
        senderName: "Aether AI",
        avatar: "auto_awesome",
        text: isFolderMode
          ? `I've analyzed the folder "${folderName || "Folder"}" containing ${documentIds?.length || 0} ready documents. What would you like to know?`
          : `I've analyzed "${fileName}". It covers enterprise expansion, AI integration, and financial targets. What would you like to know?`,
      },
    ]);

    const areArraysEqual = (arr1: number[] | null, arr2: number[]) => {
      if (!arr1) return false;
      if (arr1.length !== arr2.length) return false;
      const s1 = new Set(arr1);
      return arr2.every((x) => s1.has(x));
    };

    const initSession = async () => {
      // Chưa có ID hợp lệ thì chưa được gọi API tạo hoặc tìm session.
      if (isFolderMode && folderId === null) return;
      if (!isFolderMode && documentId === null) return;

      try {
        const response = await chatService.getSessions();
        if (response.data && response.data.success) {
          const list = response.data.data;

          // Tìm session có cùng mode và đúng tập document đang mở.
          let matched: ChatSession | undefined;
          if (isFolderMode) {
            // Folder phải khớp chính xác toàn bộ danh sách document đã chọn.
            matched = list.find(
              (s) =>
                s.mode === "SELECTED_DOCUMENTS" &&
                areArraysEqual(s.selectedDocumentIds, documentIds),
            );
          } else {
            matched = list.find(
              (s) =>
                s.mode === "SELECTED_DOCUMENTS" &&
                s.selectedDocumentIds &&
                s.selectedDocumentIds.length === 1 &&
                s.selectedDocumentIds[0] === documentId,
            );
          }

          if (matched) {
            setSessionId(matched.sessionId);

            // Có session thì tải lịch sử message để khôi phục cuộc trò chuyện trên UI.
            const messagesRes = await chatService.getSessionMessages(
              matched.sessionId,
            );
            if (messagesRes.data && messagesRes.data.success) {
              const rawMsgs = messagesRes.data.data.messages;
              const sorted = [...rawMsgs].sort(
                (a, b) => a.messageId - b.messageId,
              );
              const formatted = sorted.map((msg): ChatMessage => {
                const isAi = msg.role === "ASSISTANT";
                return {
                  id: `msg-backend-${msg.messageId}`,
                  sender: isAi ? "ai" : "user",
                  senderName: isAi ? "Aether AI" : "You",
                  avatar: isAi ? "smart_toy" : userAvatar,
                  text: msg.content,
                  sources: msg.sources,
                };
              });

              if (formatted.length > 0) {
                setMessages(formatted);
              }
            }
          }
        }
      } catch (err) {
        console.warn(
          "Session initialization failed, falling back to stateless chat:",
          err,
        );
      }
    };

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, folderId, isFolderMode, documentIdsStr]);

  // Mỗi khi message hoặc trạng thái loading đổi, cuộn xuống message mới nhất.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chặn gửi rỗng, gửi trùng khi đang chờ hoặc hỏi document chưa ingest xong.
    if (!inputVal.trim() || isAiLoading || !isChatReady) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      senderName: "You",
      avatar: userAvatar,
      text: inputVal,
    };

    setMessages((prev) => [...prev, userMessage]);
    const query = inputVal.trim();
    setInputVal("");
    // Hiển thị câu hỏi ngay lập tức và khóa input trong thời gian chờ backend/LLM.
    setIsAiLoading(true);

    const model =
      localStorage.getItem("smartChatModel") || "gemini-2.5-flash-lite";
    const savedTemp = localStorage.getItem("smartChatTemperature");
    const temperature = savedTemp ? parseFloat(savedTemp) : 0.2;

    const callStatelessFallback = async (q: string) => {
      if (isFolderMode) {
        try {
          const response = await chatService.askMultiQuestion({
            mode: "SelectedDocuments",
            selectedDocumentIds: documentIds || [],
            folderId: folderId,
            question: q,
            model,
            temperature,
          });

          if (response.data && response.data.success) {
            const data = response.data.data;

            let citationStr = "";
            if (
              data.usedDocumentIds &&
              data.usedDocumentIds.length > 0 &&
              documents
            ) {
              // Đổi documentId trong response thành tên file để citation dễ đọc trên UI.
              const names = data.usedDocumentIds.map((id) => {
                const doc = documents.find((d) => d.documentId === id);
                return doc ? doc.originalFileName : `Doc ID ${id}`;
              });
              citationStr = `Sources: ${names.join(", ")}`;
            }

            // Stateless folder response dùng answer và danh sách tài liệu đã được truy xuất để render citation.
            const aiResponse: ChatMessage = {
              id: `msg-ai-${Date.now()}`,
              sender: "ai",
              senderName: "Aether AI",
              avatar: "smart_toy",
              text: data.answer,
              citation: citationStr || undefined,
            };
            setMessages((prev) => [...prev, aiResponse]);
          } else {
            const errorMsg = response.error || "Failed to retrieve AI answer.";
            const aiResponse: ChatMessage = {
              id: `msg-ai-${Date.now()}`,
              sender: "ai",
              senderName: "Aether AI",
              avatar: "smart_toy",
              text: `Error: ${errorMsg}`,
            };
            setMessages((prev) => [...prev, aiResponse]);
          }
        } catch (err) {
          console.error("Error asking folder question:", err);
          const aiResponse: ChatMessage = {
            id: `msg-ai-${Date.now()}`,
            sender: "ai",
            senderName: "Aether AI",
            avatar: "smart_toy",
            text: "An unexpected error occurred while calling the AI folder service.",
          };
          setMessages((prev) => [...prev, aiResponse]);
        }
      } else if (documentId !== null) {
        try {
          // Fallback single-document vẫn gửi documentId để backend giới hạn truy xuất trong tài liệu này.
          const response = await chatService.askQuestion(
            documentId,
            q,
            model,
            temperature,
          );
          if (response.data && response.data.success) {
            const data = response.data.data;

            let citationStr = "";
            if (data.sources && data.sources.length > 0) {
              const pages = data.sources
                .map((s) => s.pageNumber)
                .filter((p): p is number => p !== null && p !== undefined);

              if (pages.length > 0) {
                const uniquePages = Array.from(new Set(pages)).sort(
                  (a, b) => a - b,
                );
                citationStr = `Page ${uniquePages.join(", ")}`;
              } else {
                const chunkIds = data.sources.map((s) => s.chunkId);
                citationStr = `Chunks ${chunkIds.join(", ")}`;
              }
            }

            const aiResponse: ChatMessage = {
              id: `msg-ai-${Date.now()}`,
              sender: "ai",
              senderName: "Aether AI",
              avatar: "smart_toy",
              text: data.answer,
              citation: citationStr || undefined,
            };
            setMessages((prev) => [...prev, aiResponse]);
          } else {
            const errorMsg = response.error || "Failed to retrieve AI answer.";
            const aiResponse: ChatMessage = {
              id: `msg-ai-${Date.now()}`,
              sender: "ai",
              senderName: "Aether AI",
              avatar: "smart_toy",
              text: `Error: ${errorMsg}`,
            };
            setMessages((prev) => [...prev, aiResponse]);
          }
        } catch (err) {
          console.error("Error asking question:", err);
          const aiResponse: ChatMessage = {
            id: `msg-ai-${Date.now()}`,
            sender: "ai",
            senderName: "Aether AI",
            avatar: "smart_toy",
            text: "An unexpected error occurred while calling the AI service.",
          };
          setMessages((prev) => [...prev, aiResponse]);
        }
      } else {
        // Chỉ dùng mock khi component không có documentId thật, không phải nhánh runtime của tài liệu từ backend.
        setTimeout(() => {
          let replyText = `Based on the document "${fileName}", I found relevant insights regarding your question. However, this is a mock setup. Please integrate the real AI backend to get dynamic responses!`;
          let citation: string | undefined = undefined;

          const lowerQuery = q.toLowerCase();
          if (
            lowerQuery.includes("objective") ||
            lowerQuery.includes("key objectives") ||
            lowerQuery.includes("section 2")
          ) {
            replyText = `Based on Section 2 of the document, the Key Objectives for Q3 are:
• Accelerating deployment of machine learning modules within the core platform.
• Expanding the sales task force in the EMEA region by 15 personnel.
• Reducing customer churn by 2% through proactive engagement initiatives.`;
            citation = "Page 1, Section 2";
          } else if (
            lowerQuery.includes("financial") ||
            lowerQuery.includes("projection") ||
            lowerQuery.includes("revenue") ||
            lowerQuery.includes("budget")
          ) {
            replyText = `According to Section 3 (Financial Projections), revenue targets for Q3 are set aggressively at $42M, representing strong quarter-over-quarter growth. Margin expansion remains a priority, driven by operational efficiencies. Also, the strategic pivot to AI will reallocate 20% of the R&D budget by Q4.`;
            citation = "Page 1, Section 3";
          } else if (
            lowerQuery.includes("executive") ||
            lowerQuery.includes("summary") ||
            lowerQuery.includes("q3 strategic")
          ) {
            replyText = `In the Executive Summary (Section 1), the Q3 Strategic Outlook indicates a year-over-year SaaS growth of 14% despite macroeconomic headwinds. It highlights a strategic pivot towards AI-integrated workflows to capture enterprise market demands.`;
            citation = "Page 1, Section 1";
          }

          const aiResponse: ChatMessage = {
            id: `msg-ai-${Date.now()}`,
            sender: "ai",
            senderName: "Aether AI",
            avatar: "smart_toy",
            text: replyText,
            citation,
          };

          setMessages((prev) => [...prev, aiResponse]);
          setIsAiLoading(false);
        }, 1200);
      }
    };

    let currentSessionId = sessionId;

    // Chưa có session thì tạo session SelectedDocuments với đúng một document hiện tại.
    if (currentSessionId === null) {
      try {
        const title = isFolderMode
          ? `Chat Folder: ${folderName || "Folder"}`
          : `Chat: ${fileName || "Document"}`;
        const createRes = await chatService.createSession({
          title,
          mode: "SelectedDocuments",
          selectedDocumentIds: isFolderMode ? documentIds || [] : [documentId!],
          folderId: null,
          useGeneralKnowledge: null,
          model,
          temperature,
        });

        if (createRes.data && createRes.data.success) {
          currentSessionId = createRes.data.data.sessionId;
          setSessionId(currentSessionId);
        } else {
          throw new Error("Failed to create session");
        }
      } catch (err) {
        console.warn(
          "Failed to create session dynamically, using stateless fallback:",
          err,
        );
      }
    }

    // Gửi message qua session để backend lưu lịch sử và source citation.
    if (currentSessionId !== null) {
      try {
        const response = await chatService.sendMessageToSession(
          currentSessionId,
          query,
        );
        if (response.data && response.data.success) {
          const data = response.data.data;

          // Session response dùng content và sources; sources được giữ lại để render citation.
          const aiResponse: ChatMessage = {
            id: `msg-ai-${Date.now()}`,
            sender: "ai",
            senderName: "Aether AI",
            avatar: "smart_toy",
            text: data.content,
            sources: data.sources?.length > 0 ? data.sources : undefined,
          };
          setMessages((prev) => [...prev, aiResponse]);
        } else {
          const errorMsg = response.error || "Failed to retrieve AI answer.";
          const aiResponse: ChatMessage = {
            id: `msg-ai-${Date.now()}`,
            sender: "ai",
            senderName: "Aether AI",
            avatar: "smart_toy",
            text: `Error: ${errorMsg}`,
          };
          setMessages((prev) => [...prev, aiResponse]);
        }
      } catch (err) {
        console.error(
          "Error sending message to session, trying stateless fallback:",
          err,
        );
        await callStatelessFallback(query);
      } finally {
        setIsAiLoading(false);
      }
    } else {
      await callStatelessFallback(query);
      setIsAiLoading(false);
    }
  };

  // Citation hiện chỉ thông báo vị trí/source bằng alert; chưa điều hướng preview tới chunk cụ thể.
  const handleCitationClick = (citationText: string) => {
    alert(`Navigating preview to: ${citationText}`);
  };

  return (
    <section className="flex-[4] bg-surface flex flex-col relative h-full overflow-hidden border-l border-outline-variant/30">
      {/* Header cho biết người dùng đang hỏi AI về tài liệu hiện tại. */}
      <div className="h-14 border-b border-surface-container-high flex items-center px-container-padding bg-surface-bright shrink-0 shadow-sm z-20 select-none">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined fill select-none">
            smart_toy
          </span>
          <h2 className="font-title-lg text-title-lg font-semibold">
            {isFolderMode ? "AI Folder Assistant" : "AI Document Assistant"}
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => alert("Chat options clicked")}
            className="p-1.5 text-secondary hover:bg-surface-container rounded transition-colors cursor-pointer select-none flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">
              more_vert
            </span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-secondary hover:text-error hover:bg-error/10 rounded-full transition-colors cursor-pointer select-none flex items-center justify-center"
              title="Close Chat"
            >
              <span className="material-symbols-outlined text-[20px] font-bold">
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Render lịch sử message; assistant message có thể kèm source từ document chunks. */}
      <div className="flex-1 overflow-y-auto p-container-padding flex flex-col gap-6 custom-scrollbar pb-36">
        {messages.length === 1 &&
          (isFolderMode ? (
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 select-none ${
                documentIds && documentIds.length > 0
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200/60"
                  : "bg-rose-50 text-rose-800 border-rose-200/60"
              }`}
            >
              <span
                className={`material-symbols-outlined ${documentIds && documentIds.length > 0 ? "text-emerald-600" : "text-rose-600"}`}
              >
                {documentIds && documentIds.length > 0
                  ? "check_circle"
                  : "info"}
              </span>
              <div className="text-sm font-semibold">
                {documentIds && documentIds.length > 0
                  ? `Folder is READY for Q&A (${documentIds.length} document${documentIds.length > 1 ? "s" : ""})`
                  : "No READY documents available in this folder"}
              </div>
            </div>
          ) : (
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 select-none ${
                status === "READY"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200/60"
                  : "bg-rose-50 text-rose-800 border-rose-200/60"
              }`}
            >
              <span
                className={`material-symbols-outlined ${status === "READY" ? "text-emerald-600" : "text-rose-600"}`}
              >
                {status === "READY" ? "check_circle" : "info"}
              </span>
              <div className="text-sm font-semibold">
                {status === "READY"
                  ? "This document is READY for Q&A"
                  : "This document is NOT READY for Q&A"}
              </div>
            </div>
          ))}

        {messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div
              key={msg.id}
              className={`flex gap-4 max-w-[90%] ${isAi ? "" : "self-end flex-row-reverse"}`}
            >
              {/* Hiển thị avatar khác nhau cho user và assistant để phân biệt hai phía hội thoại. */}
              {isAi ? (
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[18px] select-none">
                    {msg.avatar}
                  </span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-outline-variant">
                  <img
                    src={msg.avatar}
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Bong bóng chứa nội dung message; assistant được render Markdown. */}
              <div
                className={`flex flex-col gap-1.5 ${isAi ? "items-start" : "items-end"}`}
              >
                <span className="font-label-md text-label-md text-secondary ml-1 select-none">
                  {msg.senderName}
                </span>

                <div
                  className={`p-4 shadow-sm text-on-surface font-body-md text-body-md markdown-content ${
                    isAi
                      ? "bg-white border rounded-2xl rounded-tl-sm border-outline-variant/60 bg-white/95 text-left"
                      : "bg-surface-container-high rounded-2xl rounded-tr-sm whitespace-pre-line text-left"
                  }`}
                >
                  {isAi ? (
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  ) : (
                    <p>{msg.text}</p>
                  )}

                  {/* Badge source cho phép người dùng xem document đã cung cấp context cho answer. */}
                  {isAi &&
                    (msg.citation ||
                      (msg.sources && msg.sources.length > 0)) && (
                      <div
                        onClick={() => {
                          if (msg.sources && msg.sources.length > 0) {
                            const names = msg.sources.map((s) => {
                              const doc = documents.find(
                                (d) => d.documentId === s.documentId,
                              );
                              return doc
                                ? doc.originalFileName
                                : `Doc ID ${s.documentId}`;
                            });
                            alert(
                              `Sources:\n\n${names.map((name, i) => `${i + 1}. ${name}`).join("\n")}`,
                            );
                          } else {
                            handleCitationClick(msg.citation!);
                          }
                        }}
                        className="!hidden mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container rounded-md border border-outline-variant hover:bg-surface-variant cursor-pointer transition-colors group select-none"
                      >
                        <span className="material-symbols-outlined text-[14px] text-primary group-hover:text-primary-container select-none">
                          description
                        </span>
                        <span className="font-mono-label text-mono-label text-on-surface-variant max-w-[320px] truncate">
                          {msg.sources && msg.sources.length > 0
                            ? `Sources: ${msg.sources
                                .map((s) => {
                                  const doc = documents.find(
                                    (d) => d.documentId === s.documentId,
                                  );
                                  return doc
                                    ? doc.originalFileName
                                    : `Doc ID ${s.documentId}`;
                                })
                                .join(", ")}`
                            : msg.citation}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Placeholder trong lúc backend đang embedding/search/gọi LLM. */}
        {isAiLoading && (
          <div className="flex gap-4 max-w-[90%]">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 animate-pulse">
              <span className="material-symbols-outlined text-[18px] select-none">
                auto_awesome
              </span>
            </div>
            <div className="flex flex-col gap-1 items-start">
              <span className="font-label-md text-label-md text-secondary ml-1 select-none">
                Aether AI
              </span>
              <div className="bg-white border rounded-2xl rounded-tl-sm border-outline-variant/40 p-4 shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce delay-75" />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce delay-150" />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce delay-300" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Khu vực nhập câu hỏi được giữ ở cuối panel chat. */}
      <div className="absolute bottom-0 left-0 right-0 p-container-padding bg-gradient-to-t from-surface via-surface to-transparent pt-8 select-none z-10 shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="relative flex items-center bg-surface-container-lowest rounded-xl border border-outline-variant focus-within:border-primary-container focus-within:ring-4 focus-within:ring-primary-fixed transition-all shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        >
          <input
            type="text"
            className="flex-1 bg-transparent border-none focus:ring-0 font-body-md text-body-md text-on-surface placeholder:text-secondary-fixed-dim py-3 px-4 outline-none"
            placeholder={
              !isChatReady
                ? isFolderMode
                  ? "No READY documents available in this folder"
                  : "This document is not READY for Q&A yet"
                : isFolderMode
                  ? `Ask a question about folder "${folderName}"...`
                  : "Ask a question about this document..."
            }
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isAiLoading || !isChatReady}
          />
          <button
            type="submit"
            className="m-2 w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-on-primary-fixed-variant shadow-[0_2px_4px_rgba(160,65,0,0.2)] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            disabled={isAiLoading || !isChatReady || !inputVal.trim()}
          >
            <span className="material-symbols-outlined text-[18px] select-none">
              arrow_upward
            </span>
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="font-mono-label text-mono-label text-secondary select-none">
            AI can make mistakes. Verify important information.
          </span>
        </div>
      </div>
    </section>
  );
};
export default DocumentChat;
