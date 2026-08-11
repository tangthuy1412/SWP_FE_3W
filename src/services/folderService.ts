import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';
import type { BackendResponse, DocumentUploadResponse } from './documentService';

export interface DocumentFolderResponse {
  folderId: number;
  userId: number;
  name: string;
  isStarred: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const folderService = {
  async getFolders(): Promise<ApiResponse<BackendResponse<DocumentFolderResponse[]>>> {
    return apiClient.get<BackendResponse<DocumentFolderResponse[]>>('/document-folders');
  },

  async createFolder(name: string): Promise<ApiResponse<BackendResponse<DocumentFolderResponse>>> {
    return apiClient.post<BackendResponse<DocumentFolderResponse>>('/document-folders', { name });
  },

  async updateFolder(folderId: number, name: string): Promise<ApiResponse<BackendResponse<DocumentFolderResponse>>> {
    return apiClient.request<BackendResponse<DocumentFolderResponse>>(`/document-folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async deleteFolder(folderId: number): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(`/document-folders/${folderId}`);
  },

  async restoreFolder(folderId: number): Promise<ApiResponse<BackendResponse<DocumentFolderResponse>>> {
    return apiClient.request<BackendResponse<DocumentFolderResponse>>(`/document-folders/${folderId}/restore`, {
      method: 'PATCH',
    });
  },

  async permanentlyDeleteFolder(folderId: number): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(`/document-folders/${folderId}/permanent`);
  },

  async getFolderDocuments(folderId: number): Promise<ApiResponse<BackendResponse<DocumentUploadResponse[]>>> {
    return apiClient.get<BackendResponse<DocumentUploadResponse[]>>(`/document-folders/${folderId}/documents`);
  },

  async getStarredFolders(): Promise<ApiResponse<BackendResponse<DocumentFolderResponse[]>>> {
    return apiClient.get<BackendResponse<DocumentFolderResponse[]>>('/document-folders/starred');
  },

  async getTrashFolders(): Promise<ApiResponse<BackendResponse<DocumentFolderResponse[]>>> {
    return apiClient.get<BackendResponse<DocumentFolderResponse[]>>('/document-folders/trash');
  },

  async starFolder(folderId: number, isStarred: boolean): Promise<ApiResponse<BackendResponse<DocumentFolderResponse>>> {
    return apiClient.request<BackendResponse<DocumentFolderResponse>>(
      `/document-folders/${folderId}/star?isStarred=${isStarred}`,
      { method: 'PATCH' }
    );
  },
};

export default folderService;
