import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';
import type { BackendResponse } from './documentService';

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

export interface CreateChatSessionPayload {
  title?: string;
  mode: 'SelectedDocuments' | 'UserStorage';
  selectedDocumentIds?: number[] | null;
  folderId?: number | null;
  useGeneralKnowledge?: boolean | null;
  model?: string | null;
  temperature?: number | null;
}

// The frontend intentionally uses only the four session endpoints documented by the backend.
export const chatService = {
  getSessions(): Promise<ApiResponse<BackendResponse<ChatSession[]>>> {
    return apiClient.get<BackendResponse<ChatSession[]>>('/chat/sessions');
  },

  createSession(payload: CreateChatSessionPayload): Promise<ApiResponse<BackendResponse<ChatSession>>> {
    return apiClient.post<BackendResponse<ChatSession>>('/chat/sessions', payload);
  },

  getSessionMessages(sessionId: number, page = 0, size = 50): Promise<ApiResponse<BackendResponse<SessionMessagesResponse>>> {
    return apiClient.get<BackendResponse<SessionMessagesResponse>>(`/chat/sessions/${sessionId}/messages?page=${page}&size=${size}`);
  },

  sendMessageToSession(
    sessionId: number,
    question: string,
  ): Promise<ApiResponse<BackendResponse<ChatMessageFromBackend>>> {
    return apiClient.post<BackendResponse<ChatMessageFromBackend>>(
      `/chat/sessions/${sessionId}/messages`,
      { question },
    );
  },

  deleteSession(sessionId: number): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(`/chat/sessions/${sessionId}`);
  },
};

export default chatService;
