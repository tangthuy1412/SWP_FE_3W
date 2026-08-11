export const getReadSharedDocIds = (userId: number | null): Set<number> => {
  if (!userId) return new Set();
  const key = `read_shared_doc_ids_${userId}`;
  try {
    const json = localStorage.getItem(key);
    if (json) {
      const arr = JSON.parse(json);
      if (Array.isArray(arr)) {
        return new Set(arr.map(Number));
      }
    }
  } catch (e) {
    console.error('Failed to parse read_shared_doc_ids:', e);
  }
  return new Set();
};

export const markSharedDocAsRead = (documentId: number, userId: number | null): void => {
  if (!userId || !documentId) return;
  const key = `read_shared_doc_ids_${userId}`;
  const currentSet = getReadSharedDocIds(userId);
  if (!currentSet.has(documentId)) {
    currentSet.add(documentId);
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(currentSet)));
      window.dispatchEvent(new Event('shared-doc-read-updated'));
    } catch (e) {
      console.error('Failed to save read_shared_doc_ids:', e);
    }
  }
};
