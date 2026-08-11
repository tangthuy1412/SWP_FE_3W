import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';
import type { BackendResponse } from './documentService';

export interface ChatSource {
  chunkId: number;
  chunkIndex: number;
  pageNumber: number | null;
  score: number;
}

export interface AskQuestionResponse {
  documentId: number;
  answer: string;
  sources: ChatSource[];
  model?: string;
  temperature?: number;
}

export interface AskMultiQuestionResponse {
  answer: string;
  mode: string;
  usedDocumentIds: number[];
  sources: {
    documentId: number;
    documentName: string;
    chunkId: number;
    contentPreview: string | null;
    similarityScore: number;
  }[];
  model?: string;
  temperature?: number;
}

export interface ChatSession {
  sessionId: number;
  title: string;
  mode: 'SELECTED_DOCUMENTS' | 'USER_STORAGE';
  folderId: number | null;
  policy: string;
  model: string;
  temperature: number;
  selectedDocumentIds: number[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageSource {
  documentId: number;
  chunkId: number;
  pageNumber: number | null;
  score: number;
}

export interface ChatMessageFromBackend {
  messageId: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  status: 'COMPLETED' | 'FAILED';
  createdAt: string;
  sources: MessageSource[];
}

export interface SessionMessagesResponse {
  messages: ChatMessageFromBackend[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const chatService = {
  // Fallback stateless: gửi một câu hỏi trực tiếp cho một document và không tạo lịch sử session.
  async askQuestion(
    documentId: number, 
    question: string,
    model?: string | null,
    temperature?: number | null
  ): Promise<ApiResponse<BackendResponse<AskQuestionResponse>>> {
    return apiClient.post<BackendResponse<AskQuestionResponse>>('/chat/ask', {
      documentId,
      question,
      model,
      temperature,
    });
  },

  async askMultiQuestion(payload: {
    mode: 'SelectedDocuments' | 'UserStorage';
    selectedDocumentIds: number[] | null;
    folderId?: number | null;
    question: string;
    model?: string | null;
    temperature?: number | null;
  }): Promise<ApiResponse<BackendResponse<AskMultiQuestionResponse>>> {
    return apiClient.post<BackendResponse<AskMultiQuestionResponse>>('/chat/ask-multi', payload);
  },

  // Tạo session persistent; single-document truyền mode SelectedDocuments và một documentId duy nhất.
  async createSession(payload: {
    title?: string;
    mode: 'SelectedDocuments' | 'UserStorage';
    selectedDocumentIds?: number[] | null;
    folderId?: number | null;
    useGeneralKnowledge?: boolean | null;
    model?: string | null;
    temperature?: number | null;
  }): Promise<ApiResponse<BackendResponse<ChatSession>>> {
    return apiClient.post<BackendResponse<ChatSession>>('/chat/sessions', payload);
  },

  // Lấy các session chưa bị xóa để DocumentChat tìm lại session của document hiện tại.
  async getSessions(): Promise<ApiResponse<BackendResponse<ChatSession[]>>> {
    return apiClient.get<BackendResponse<ChatSession[]>>('/chat/sessions');
  },

  async renameSession(sessionId: number, title: string): Promise<ApiResponse<BackendResponse<ChatSession>>> {
    return apiClient.request<BackendResponse<ChatSession>>(
      `/chat/sessions/${sessionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }
    );
  },

  async deleteSession(sessionId: number): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(`/chat/sessions/${sessionId}`);
  },

  // Tải lịch sử message cùng source citation để khôi phục UI sau khi mở lại tài liệu.
  async getSessionMessages(sessionId: number, page = 0, size = 50): Promise<ApiResponse<BackendResponse<SessionMessagesResponse>>> {
    return apiClient.get<BackendResponse<SessionMessagesResponse>>(`/chat/sessions/${sessionId}/messages?page=${page}&size=${size}`);
  },

  // Gửi câu hỏi vào session; backend sẽ RAG, gọi LLM, lưu message và trả assistant message.
  async sendMessageToSession(
    sessionId: number,
    question: string,
    model?: string | null,
    useGeneralKnowledge?: boolean | null,
    temperature?: number | null
  ): Promise<ApiResponse<BackendResponse<ChatMessageFromBackend>>> {
    return apiClient.post<BackendResponse<ChatMessageFromBackend>>(
      `/chat/sessions/${sessionId}/messages`,
      { question, model, useGeneralKnowledge, temperature }
    );
  },
};

export default chatService;
