export interface OfflineDocumentRecord {
  key?: string;
  documentId: number;
  userId?: number | null;
  fileName: string;
  contentType: string;
  fileSize: number;
  lastModified: string;
  savedAt: string;
  syncStatus?: OfflineDocumentSyncStatus;
  lastSyncedAt?: string;
  syncMessage?: string;
  remoteFileName?: string;
  remoteContentType?: string;
  remoteFileSize?: number;
  remoteLastModified?: string;
  blob: Blob;
}

export type OfflineDocumentSyncStatus =
  | 'UP_TO_DATE'
  | 'UPDATE_AVAILABLE'
  | 'DELETED'
  | 'ACCESS_REMOVED';

const DB_NAME = 'aetherdocs-offline-documents';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

const buildKey = (documentId: number, userId: number) => `${userId}:${documentId}`;

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('documentId', 'documentId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
) => {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const saveOfflineDocument = async (record: OfflineDocumentRecord & { userId: number }) => {
  const storedRecord: OfflineDocumentRecord = {
    ...record,
    userId: record.userId,
    key: buildKey(record.documentId, record.userId),
  };

  await withStore('readwrite', (store) => store.put(storedRecord));
};

export const updateOfflineDocument = async (record: OfflineDocumentRecord & { userId: number }) => {
  const storedRecord: OfflineDocumentRecord = {
    ...record,
    userId: record.userId,
    key: buildKey(record.documentId, record.userId),
  };

  await withStore('readwrite', (store) => store.put(storedRecord));
};

export const getOfflineDocument = async (documentId: number, userId: number) =>
  withStore<OfflineDocumentRecord | undefined>('readonly', (store) =>
    store.get(buildKey(documentId, userId))
  );

export const deleteOfflineDocument = async (documentId: number, userId: number) => {
  await withStore('readwrite', (store) => store.delete(buildKey(documentId, userId)));
};

export const getAllOfflineDocuments = async (userId: number) => {
  const records = await withStore<OfflineDocumentRecord[]>('readonly', (store) => store.getAll());
  return records.filter((record) => record.userId === userId);
};

export const deleteAllOfflineDocuments = async (userId: number) => {
  const records = await getAllOfflineDocuments(userId);
  await Promise.all(
    records.map((record) =>
      withStore('readwrite', (store) => store.delete(buildKey(record.documentId, userId)))
    )
  );
};

export const isOfflineDocumentSaved = async (documentId: number, userId: number) => {
  const record = await getOfflineDocument(documentId, userId);
  return !!record;
};
