import { apiClient } from "./apiClient";
import type { ApiResponse } from "./apiClient";

export interface DocumentUploadResponse {
  documentId: number;
  userId: number;
  ownerEmail?: string;
  folderId: number | null;
  originalFileName: string;
  s3Key: string;
  contentType: string;
  fileSize: number;
  isPublic: boolean;
  isDeleted: boolean;
  isStarred: boolean;
  status: "UPLOADED" | "PARSING" | "INDEXING" | "READY" | "FAILED";
  uploadedAt: string;
  deletedAt: string | null;
}

export interface BackendResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: unknown;
  timestamp: string;
}

export interface DocumentUrlResponse {
  url: string;
  expiresAt: string;
  fileName: string;
  contentType: string;
}

export type DocumentFilterSort = 'NEWEST' | 'OLDEST';

export interface DocumentFilterParams {
  tagIds?: number[];
  contentType?: string;
  createdFrom?: string;
  createdTo?: string;
  sort?: DocumentFilterSort;
  page?: number;
  size?: number;
}

export interface DocumentPageResponse {
  documents: DocumentUploadResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DocumentShareLinkResponse {
  shareLinkId: number;
  documentId: number;
  token: string;
  accessPath: string;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface DocumentShareResponse {
  documentShareId: number;
  documentId: number;
  ownerId: number;
  sharedWithUserId: number;
  sharedWithEmail: string;
  sharedWithName: string;
  createdAt: string;
}

export const documentService = {
  async getMyDocuments(): Promise<
    ApiResponse<BackendResponse<DocumentUploadResponse[]>>
  > {
    return apiClient.get<BackendResponse<DocumentUploadResponse[]>>(
      "/documents/my",
    );
  },

  async uploadDocument(
    file: File,
    isPublic = false,
    folderId: number | null = null,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    // Gửi multipart data lên backend; server validate entitlement, lưu file và bắt đầu ingestion.
    const formData = new FormData();
    formData.append("file", file);
    formData.append("isPublic", String(isPublic));
    if (folderId !== null) {
      formData.append("folderId", String(folderId));
    }
    return apiClient.post<BackendResponse<DocumentUploadResponse>>(
      "/documents/upload",
      formData,
    );
  },

  async getDocumentDetail(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    return apiClient.get<BackendResponse<DocumentUploadResponse>>(
      `/documents/${documentId}`,
    );
  },

  async deleteDocument(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    return apiClient.delete<BackendResponse<DocumentUploadResponse>>(
      `/documents/${documentId}`,
    );
  },

  async getTrashDocuments(): Promise<
    ApiResponse<BackendResponse<DocumentUploadResponse[]>>
  > {
    return apiClient.get<BackendResponse<DocumentUploadResponse[]>>(
      "/documents/trash",
    );
  },

  async restoreDocument(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    return apiClient.post<BackendResponse<DocumentUploadResponse>>(
      `/documents/${documentId}/restore`,
    );
  },

  async deleteDocumentPermanently(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(
      `/documents/${documentId}/permanent`,
    );
  },

  async updateDocumentVisibility(
    documentId: number,
    isPublic: boolean,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    return apiClient.request<BackendResponse<DocumentUploadResponse>>(
      `/documents/${documentId}/visibility?isPublic=${isPublic}`,
      { method: "PATCH" },
    );
  },

  async getDocumentPreviewUrl(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUrlResponse>>> {
    return apiClient.get<BackendResponse<DocumentUrlResponse>>(
      `/documents/${documentId}/preview-url`,
    );
  },

  async getDocumentDownloadUrl(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUrlResponse>>> {
    return apiClient.get<BackendResponse<DocumentUrlResponse>>(
      `/documents/${documentId}/download-url`,
    );
  },

  async renameDocument(
    documentId: number,
    name: string,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    return apiClient.request<BackendResponse<DocumentUploadResponse>>(
      `/documents/${documentId}/rename`,
      {
        method: "PATCH",
        body: JSON.stringify({ originalFileName: name }),
      },
    );
  },

  async moveDocumentToFolder(
    documentId: number,
    folderId: number | null,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    // Đưa file vào folder tách khỏi upload vì response upload mới cung cấp documentId.
    return apiClient.request<BackendResponse<DocumentUploadResponse>>(
      `/documents/${documentId}/folder`,
      {
        method: "PATCH",
        body: JSON.stringify({ folderId }),
      },
    );
  },

  async getStarredDocuments(): Promise<
    ApiResponse<BackendResponse<DocumentUploadResponse[]>>
  > {
    return apiClient.get<BackendResponse<DocumentUploadResponse[]>>(
      "/documents/starred",
    );
  },

  async filterMyDocuments(params: DocumentFilterParams): Promise<ApiResponse<BackendResponse<DocumentPageResponse>>> {
    const query = new URLSearchParams();
    (params.tagIds || []).forEach((id) => query.append('tagIds', String(id)));
    if (params.contentType) query.set('contentType', params.contentType);
    if (params.createdFrom) query.set('createdFrom', params.createdFrom);
    if (params.createdTo) query.set('createdTo', params.createdTo);
    query.set('sort', params.sort || 'NEWEST');
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 20));
    return apiClient.get<BackendResponse<DocumentPageResponse>>(`/documents/filter?${query.toString()}`);
  },

  async starDocument(
    documentId: number,
    isStarred: boolean,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    return apiClient.request<BackendResponse<DocumentUploadResponse>>(
      `/documents/${documentId}/star?isStarred=${isStarred}`,
      { method: "PATCH" },
    );
  },

  async getPublicDocuments(): Promise<
    ApiResponse<BackendResponse<DocumentUploadResponse[]>>
  > {
    return apiClient.get<BackendResponse<DocumentUploadResponse[]>>(
      "/documents/public",
    );
  },

  async getPublicDocumentDetail(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    return apiClient.get<BackendResponse<DocumentUploadResponse>>(
      `/documents/public/${documentId}`,
    );
  },

  async getPublicDocumentPreviewUrl(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUrlResponse>>> {
    return apiClient.get<BackendResponse<DocumentUrlResponse>>(
      `/documents/public/${documentId}/preview-url`,
    );
  },

  async getPublicDocumentDownloadUrl(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUrlResponse>>> {
    return apiClient.get<BackendResponse<DocumentUrlResponse>>(
      `/documents/public/${documentId}/download-url`,
    );
  },

  async savePublicDocumentToMyFiles(
    documentId: number,
    folderId: number | null = null,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    const url = folderId !== null
      ? `/documents/public/${documentId}/save-to-my-files?folderId=${folderId}`
      : `/documents/public/${documentId}/save-to-my-files`;
    return apiClient.post<BackendResponse<DocumentUploadResponse>>(url);
  },

  async bulkSavePublicDocumentsToMyFiles(
    documentIds: number[],
    folderId: number | null = null,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse[]>>> {
    const results = await Promise.all(
      documentIds.map((id) => this.savePublicDocumentToMyFiles(id, folderId))
    );
    const hasFailure = results.some((r) => !r.data || !r.data.success);
    if (hasFailure) {
      return { status: 500, error: 'Failed to save some public documents to My Files.' };
    }
    return {
      status: 200,
      data: {
        success: true,
        message: 'All documents saved to My Files',
        data: [],
        errors: null,
        timestamp: new Date().toISOString(),
      },
    };
  },

  // Document public link share APIs
  async createShareLink(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentShareLinkResponse>>> {
    return apiClient.post<BackendResponse<DocumentShareLinkResponse>>(
      `/documents/${documentId}/share-link`,
    );
  },

  async disableShareLink(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentShareLinkResponse>>> {
    return apiClient.delete<BackendResponse<DocumentShareLinkResponse>>(
      `/documents/${documentId}/share-link`,
    );
  },

  async getSharedDocumentByLink(
    token: string,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    return apiClient.get<BackendResponse<DocumentUploadResponse>>(
      `/documents/share-link/${token}`,
    );
  },

  async getSharedDocumentPreviewUrlByLink(
    token: string,
  ): Promise<ApiResponse<BackendResponse<DocumentUrlResponse>>> {
    return apiClient.get<BackendResponse<DocumentUrlResponse>>(
      `/documents/share-link/${token}/preview-url`,
    );
  },

  async getSharedDocumentDownloadUrlByLink(
    token: string,
  ): Promise<ApiResponse<BackendResponse<DocumentUrlResponse>>> {
    return apiClient.get<BackendResponse<DocumentUrlResponse>>(
      `/documents/share-link/${token}/download-url`,
    );
  },

  async saveShareLinkToSharedWithMe(
    token: string,
  ): Promise<ApiResponse<BackendResponse<DocumentShareResponse>>> {
    return apiClient.post<BackendResponse<DocumentShareResponse>>(
      `/documents/share-link/${token}/save`,
    );
  },

  // Direct user sharing APIs
  async getDocumentShares(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentShareResponse[]>>> {
    return apiClient.get<BackendResponse<DocumentShareResponse[]>>(
      `/documents/${documentId}/shares/users`,
    );
  },

  async shareDocumentWithUser(
    documentId: number,
    email: string,
  ): Promise<ApiResponse<BackendResponse<DocumentShareResponse>>> {
    return apiClient.post<BackendResponse<DocumentShareResponse>>(
      `/documents/${documentId}/shares/users`,
      { email },
    );
  },

  async removeUserShare(
    documentId: number,
    userId: number,
  ): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(
      `/documents/${documentId}/shares/users/${userId}`,
    );
  },

  async getSharedWithMeDocuments(): Promise<
    ApiResponse<BackendResponse<DocumentUploadResponse[]>>
  > {
    return apiClient.get<BackendResponse<DocumentUploadResponse[]>>(
      "/documents/shared-with-me",
    );
  },

  async getSharedWithMeDocumentDetail(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    return apiClient.get<BackendResponse<DocumentUploadResponse>>(
      `/documents/shared-with-me/${documentId}`,
    );
  },

  async getSharedWithMePreviewUrl(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUrlResponse>>> {
    return apiClient.get<BackendResponse<DocumentUrlResponse>>(
      `/documents/shared-with-me/${documentId}/preview-url`,
    );
  },

  async getSharedWithMeDownloadUrl(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<DocumentUrlResponse>>> {
    return apiClient.get<BackendResponse<DocumentUrlResponse>>(
      `/documents/shared-with-me/${documentId}/download-url`,
    );
  },

  async removeSharedWithMeDocument(
    documentId: number,
  ): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(
      `/documents/shared-with-me/${documentId}`,
    );
  },

  async bulkRemoveSharedWithMeDocuments(
    documentIds: number[],
  ): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.post<BackendResponse<null>>(
      "/documents/shared-with-me/bulk-remove",
      documentIds,
    );
  },

  async bulkMoveDocuments(
    documentIds: number[],
    folderId: number | null,
  ): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.request<BackendResponse<null>>("/documents/bulk-move", {
      method: "PATCH",
      body: JSON.stringify({ documentIds, folderId }),
      headers: { "Content-Type": "application/json" },
    });
  },

  async bulkTrashDocuments(
    documentIds: number[],
  ): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.post<BackendResponse<null>>(
      "/documents/bulk-trash",
      documentIds,
    );
  },

  async saveSharedWithMeDocumentToMyFiles(
    documentId: number,
    folderId: number | null = null,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse>>> {
    const url = folderId !== null
      ? `/documents/shared-with-me/${documentId}/save-to-my-files?folderId=${folderId}`
      : `/documents/shared-with-me/${documentId}/save-to-my-files`;
    return apiClient.post<BackendResponse<DocumentUploadResponse>>(url);
  },

  async bulkSaveSharedWithMeDocumentsToMyFiles(
    documentIds: number[],
    folderId: number | null = null,
  ): Promise<ApiResponse<BackendResponse<DocumentUploadResponse[]>>> {
    const results = await Promise.all(
      documentIds.map((id) => this.saveSharedWithMeDocumentToMyFiles(id, folderId))
    );
    const hasFailure = results.some((r) => !r.data || !r.data.success);
    if (hasFailure) {
      return { status: 500, error: 'Failed to save some shared documents to My Files.' };
    }
    return {
      status: 200,
      data: {
        success: true,
        message: 'All shared documents saved to My Files',
        data: [],
        errors: null,
        timestamp: new Date().toISOString(),
      },
    };
  },
};
export default documentService;
