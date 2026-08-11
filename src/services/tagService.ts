import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';
import type { BackendResponse } from './documentService';

export interface TagResponse {
  tagId: number;
  userId: number;
  name: string;
  color: string;
  createdAt: string;
}

export const tagService = {
  async getTags(): Promise<ApiResponse<BackendResponse<TagResponse[]>>> {
    // Load các tag user có thể dùng cho tag selector trong upload modal.
    return apiClient.get<BackendResponse<TagResponse[]>>('/tags');
  },

  async createTag(name: string, color: string): Promise<ApiResponse<BackendResponse<TagResponse>>> {
    return apiClient.post<BackendResponse<TagResponse>>('/tags', { name, color });
  },

  async updateTag(tagId: number, name: string, color: string): Promise<ApiResponse<BackendResponse<TagResponse>>> {
    return apiClient.request<BackendResponse<TagResponse>>(`/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, color }),
    });
  },

  async deleteTag(tagId: number): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(`/tags/${tagId}`);
  },

  async addTagToDocument(documentId: number, tagId: number): Promise<ApiResponse<BackendResponse<TagResponse>>> {
    // Gắn tag đã chọn sau khi document tồn tại và có database id.
    return apiClient.post<BackendResponse<TagResponse>>(`/documents/${documentId}/tags/${tagId}`);
  },

  async removeTagFromDocument(documentId: number, tagId: number): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(`/documents/${documentId}/tags/${tagId}`);
  },

  async getDocumentTags(documentId: number): Promise<ApiResponse<BackendResponse<TagResponse[]>>> {
    return apiClient.get<BackendResponse<TagResponse[]>>(`/documents/${documentId}/tags`);
  },

  async getPublicDocumentTags(documentId: number): Promise<ApiResponse<BackendResponse<TagResponse[]>>> {
    return apiClient.get<BackendResponse<TagResponse[]>>(`/documents/public/${documentId}/tags`);
  }
};

export default tagService;
