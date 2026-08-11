import React, { useState, useEffect } from 'react';

export interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: { folderId: number | string; name: string }[];
  currentFolderId: number | string | null | undefined;
  onMove: (targetFolderId: number | string | null) => Promise<void>;
}

export const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onMove,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<number | string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFolderId(currentFolderId !== undefined ? currentFolderId : null);
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, currentFolderId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFolderId === currentFolderId) {
      onClose(); // No change
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onMove(selectedFolderId);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to move document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-surface rounded-2xl border border-surface-variant max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[80vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-variant flex items-center justify-between select-none">
          <h3 className="font-title-lg text-title-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">drive_file_move</span>
            Move Document
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="material-symbols-outlined text-secondary hover:text-on-surface hover:bg-surface-variant p-1 rounded-full cursor-pointer transition-colors"
          >
            close
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <p className="font-body-md text-secondary select-none">
              Select a target folder for this document:
            </p>

            <div className="space-y-2">
              {/* Root / My Files Option */}
              <label
                className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer select-none transition-all ${
                  selectedFolderId === null
                    ? 'border-primary bg-primary-fixed/10 text-primary font-bold'
                    : 'border-surface-variant/60 hover:bg-surface-container-low text-on-surface'
                }`}
              >
                <input
                  type="radio"
                  name="target-folder"
                  checked={selectedFolderId === null}
                  onChange={() => setSelectedFolderId(null)}
                  disabled={isSubmitting}
                  className="w-4.5 h-4.5 text-primary border-surface-variant focus:ring-primary/20 cursor-pointer"
                />
                <span className="material-symbols-outlined text-[20px] select-none text-secondary">
                  folder_open
                </span>
                <span className="text-body-md">My Files (Root)</span>
              </label>

              {/* Folder list */}
              {folders.length > 0 ? (
                folders.map((folder) => (
                  <label
                    key={folder.folderId}
                    className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer select-none transition-all ${
                      selectedFolderId === folder.folderId
                        ? 'border-primary bg-primary-fixed/10 text-primary font-bold'
                        : 'border-surface-variant/60 hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      name="target-folder"
                      checked={selectedFolderId === folder.folderId}
                      onChange={() => setSelectedFolderId(folder.folderId)}
                      disabled={isSubmitting}
                      className="w-4.5 h-4.5 text-primary border-surface-variant focus:ring-primary/20 cursor-pointer"
                    />
                    <span className="material-symbols-outlined text-[20px] select-none text-secondary icon-fill">
                      folder
                    </span>
                    <span className="text-body-md truncate">{folder.name}</span>
                  </label>
                ))
              ) : (
                <div className="text-center py-6 text-secondary text-xs">
                  No folders available. Create a folder first to move files.
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-error-container/20 border border-error/20 text-error text-xs rounded-lg flex items-center gap-2 animate-in fade-in select-none">
                <span className="material-symbols-outlined text-base">error</span>
                {errorMsg}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-surface-container-low border-t border-surface-variant flex items-center justify-end gap-3 select-none">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-secondary font-bold hover:text-on-surface hover:bg-surface-variant rounded-lg transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/90 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-primary/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-on-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Moving...
                </>
              ) : (
                'Move'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default MoveToFolderModal;
