import { documentService } from './documentService';
import {
  getAllOfflineDocuments,
  saveOfflineDocument,
  updateOfflineDocument,
} from '../lib/offlineDocumentDb';
import type { OfflineDocumentRecord, OfflineDocumentSyncStatus } from '../lib/offlineDocumentDb';
import type { DocumentUploadResponse } from './documentService';

export type OfflineDocumentErrorCode =
  | 'UNSUPPORTED_TYPE'
  | 'OFFLINE'
  | 'DOWNLOAD_URL_FAILED'
  | 'EXPIRED_URL'
  | 'NETWORK_INTERRUPTED'
  | 'BLOB_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'STORAGE_FAILED';

export class OfflineDocumentError extends Error {
  code: OfflineDocumentErrorCode;

  constructor(code: OfflineDocumentErrorCode, message: string) {
    super(message);
    this.name = 'OfflineDocumentError';
    this.code = code;
  }
}

export interface SaveOfflineDocumentInput {
  documentId: number;
  userId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  lastModified: string;
}

export interface OfflineSyncResult {
  records: OfflineDocumentRecord[];
  checked: number;
  failed: number;
}

const syncPromises = new Map<number, Promise<OfflineSyncResult>>();

export const isOfflinePreviewSupported = (fileName: string, contentType: string) => {
  const normalizedType = contentType.toLowerCase();
  const normalizedName = fileName.toLowerCase();

  return (
    normalizedType === 'application/pdf' ||
    normalizedType.startsWith('image/') ||
    normalizedType.startsWith('video/') ||
    normalizedType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.(pdf|png|jpe?g|gif|webp|svg|bmp|docx|mp4|mkv|mov|avi|webm|wmv|flv|3gp|ogg)$/i.test(normalizedName)
  );
};

const isQuotaError = (error: unknown) =>
  error instanceof DOMException &&
  (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

const isNetworkError = (error: unknown) =>
  error instanceof TypeError ||
  (error instanceof DOMException && error.name === 'AbortError');

const metadataChanged = (record: OfflineDocumentRecord, latest: DocumentUploadResponse) =>
  record.lastModified !== latest.uploadedAt ||
  record.fileSize !== latest.fileSize ||
  record.fileName !== latest.originalFileName ||
  record.contentType !== latest.contentType;

const markRecord = (
  record: OfflineDocumentRecord,
  syncStatus: OfflineDocumentSyncStatus,
  message: string,
  latest?: DocumentUploadResponse
): OfflineDocumentRecord => ({
  ...record,
  syncStatus,
  syncMessage: message,
  lastSyncedAt: new Date().toISOString(),
  remoteFileName: latest?.originalFileName,
  remoteContentType: latest?.contentType,
  remoteFileSize: latest?.fileSize,
  remoteLastModified: latest?.uploadedAt,
});

const classifyMetadataFailure = (record: OfflineDocumentRecord, status: number, error?: string): OfflineDocumentRecord | null => {
  const normalizedError = (error || '').toLowerCase();

  if (status === 401 || status === 403 || normalizedError.includes('forbidden') || normalizedError.includes('permission')) {
    return markRecord(record, 'ACCESS_REMOVED', 'Access to this online document was removed.');
  }

  if (
    status === 404 ||
    normalizedError.includes('not found') ||
    normalizedError.includes('deleted') ||
    normalizedError.includes('does not exist')
  ) {
    return markRecord(record, 'DELETED', 'This document no longer exists online.');
  }

  return null;
};

export const offlineDocumentService = {
  async saveDocumentForOffline(input: SaveOfflineDocumentInput) {
    if (!navigator.onLine) {
      throw new OfflineDocumentError('OFFLINE', 'Reconnect to the internet before saving this document offline.');
    }

    if (!isOfflinePreviewSupported(input.fileName, input.contentType)) {
      throw new OfflineDocumentError(
        'UNSUPPORTED_TYPE',
        'This file type is not supported for offline preview yet. You can still download it normally.'
      );
    }

    const downloadResponse = await documentService.getDocumentDownloadUrl(input.documentId);
    if (!downloadResponse.data?.success) {
      if (downloadResponse.status === 401 || downloadResponse.status === 403) {
        throw new OfflineDocumentError(
          'EXPIRED_URL',
          'Your secure download link expired or is no longer authorized. Refresh the page and try again.'
        );
      }

      if (
        downloadResponse.status === 500 &&
        downloadResponse.error &&
        /network|fetch|connect|offline/i.test(downloadResponse.error)
      ) {
        throw new OfflineDocumentError(
          'NETWORK_INTERRUPTED',
          'The connection dropped before the download could start. Check your network and try again.'
        );
      }

      throw new OfflineDocumentError(
        'DOWNLOAD_URL_FAILED',
        downloadResponse.error || 'Could not prepare this document for offline saving.'
      );
    }

    const downloadInfo = downloadResponse.data.data;
    let fileResponse: Response;
    try {
      fileResponse = await fetch(downloadInfo.url);
    } catch (error) {
      if (isNetworkError(error)) {
        throw new OfflineDocumentError(
          'NETWORK_INTERRUPTED',
          'The download was interrupted. Check your connection and try saving again.'
        );
      }
      throw error;
    }

    if (!fileResponse.ok) {
      if (fileResponse.status === 401 || fileResponse.status === 403) {
        throw new OfflineDocumentError(
          'EXPIRED_URL',
          'The secure download link expired before the file finished downloading. Try saving again.'
        );
      }

      throw new OfflineDocumentError(
        'NETWORK_INTERRUPTED',
        `The document download failed (${fileResponse.status}). Try again when your connection is stable.`
      );
    }

    let blob: Blob;
    try {
      blob = await fileResponse.blob();
    } catch {
      throw new OfflineDocumentError(
        'BLOB_FAILED',
        'The browser could not prepare this file for offline storage. Try downloading it again.'
      );
    }

    if (!blob || blob.size === 0) {
      throw new OfflineDocumentError(
        'BLOB_FAILED',
        'The downloaded file was empty or unreadable. Try saving it again.'
      );
    }

    const record = {
      documentId: input.documentId,
      userId: input.userId,
      fileName: input.fileName,
      contentType: blob.type || downloadInfo.contentType || input.contentType,
      fileSize: blob.size || input.fileSize,
      lastModified: input.lastModified,
      savedAt: new Date().toISOString(),
      blob,
    };

    try {
      await saveOfflineDocument(record);
    } catch (error) {
      if (isQuotaError(error)) {
        throw new OfflineDocumentError(
          'QUOTA_EXCEEDED',
          'Your browser does not have enough storage space for this offline copy. Remove another offline file or free browser storage.'
        );
      }

      throw new OfflineDocumentError(
        'STORAGE_FAILED',
        'The browser could not save this document offline. Try again or check browser storage permissions.'
      );
    }

    return record;
  },

  async synchronizeOfflineDocuments(userId: number): Promise<OfflineSyncResult> {
    const existingPromise = syncPromises.get(userId);
    if (existingPromise) return existingPromise;

    if (!navigator.onLine) {
      throw new OfflineDocumentError('OFFLINE', 'Reconnect to the internet before synchronizing offline documents.');
    }

    const syncPromise = (async () => {
      const records = await getAllOfflineDocuments(userId);
      const syncedRecords: OfflineDocumentRecord[] = [];
      let failed = 0;

      for (const record of records) {
        try {
          const detailResponse = await documentService.getDocumentDetail(record.documentId);
          let updatedRecord: OfflineDocumentRecord;

          if (detailResponse.data?.success) {
            const latest = detailResponse.data.data;

            if (latest.isDeleted) {
              updatedRecord = markRecord(record, 'DELETED', 'This document has been deleted online.', latest);
            } else if (metadataChanged(record, latest)) {
              updatedRecord = markRecord(record, 'UPDATE_AVAILABLE', 'A newer online version is available.', latest);
            } else {
              updatedRecord = markRecord(record, 'UP_TO_DATE', 'Offline copy matches the online version.', latest);
            }
          } else {
            const classifiedRecord = classifyMetadataFailure(record, detailResponse.status, detailResponse.error);
            if (!classifiedRecord) {
              failed += 1;
              syncedRecords.push(record);
              continue;
            }
            updatedRecord = classifiedRecord;
          }

          await updateOfflineDocument({ ...updatedRecord, userId });
          syncedRecords.push(updatedRecord);
        } catch (error) {
          console.error(`Failed to synchronize offline document ${record.documentId}:`, error);
          failed += 1;
          syncedRecords.push(record);
        }
      }

      return {
        records: syncedRecords,
        checked: records.length,
        failed,
      };
    })();
    syncPromises.set(userId, syncPromise);

    try {
      return await syncPromise;
    } finally {
      syncPromises.delete(userId);
    }
  },

  async refreshOfflineCopy(record: OfflineDocumentRecord, userId: number) {
    if (record.userId !== userId) {
      throw new OfflineDocumentError('STORAGE_FAILED', 'This offline copy belongs to a different account.');
    }
    if (record.syncStatus === 'DELETED') {
      throw new OfflineDocumentError('DOWNLOAD_URL_FAILED', 'This document was deleted online. Remove the stale offline copy instead.');
    }

    if (record.syncStatus === 'ACCESS_REMOVED') {
      throw new OfflineDocumentError('DOWNLOAD_URL_FAILED', 'Access to this document was removed. Remove the stale offline copy instead.');
    }

    const refreshedRecord = await this.saveDocumentForOffline({
      documentId: record.documentId,
      userId,
      fileName: record.remoteFileName || record.fileName,
      contentType: record.remoteContentType || record.contentType,
      fileSize: record.remoteFileSize || record.fileSize,
      lastModified: record.remoteLastModified || record.lastModified,
    });

    const syncedRecord: OfflineDocumentRecord = {
      ...refreshedRecord,
      syncStatus: 'UP_TO_DATE',
      syncMessage: 'Offline copy refreshed from the online version.',
      lastSyncedAt: new Date().toISOString(),
      remoteFileName: undefined,
      remoteContentType: undefined,
      remoteFileSize: undefined,
      remoteLastModified: undefined,
    };

    await updateOfflineDocument({ ...syncedRecord, userId });
    return syncedRecord;
  },
};

export default offlineDocumentService;
