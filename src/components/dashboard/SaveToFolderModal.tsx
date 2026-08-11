import React, { useState, useEffect } from 'react';

export interface SaveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  folders: { folderId: number | string; name: string }[];
  onSave: (targetFolderId: number | string | null) => Promise<void>;
}

export const SaveToFolderModal: React.FC<SaveToFolderModalProps> = ({
  isOpen,
  onClose,
  documentName,
  folders,
  onSave,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<number | string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(null);
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSave(selectedFolderId);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save document.');
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
            <span className="material-symbols-outlined text-primary text-[24px]">save_alt</span>
            Save to My Files
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
              Saving <span className="font-semibold text-on-surface">"{documentName}"</span> to your personal storage. Select a target folder:
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
                  name="save-target-folder"
                  checked={selectedFolderId === null}
                  onChange={() => setSelectedFolderId(null)}
                  disabled={isSubmitting}
                  className="w-4.5 h-4.5 text-primary border-surface-variant focus:ring-primary/20 cursor-pointer"
                />
                <span className="material-symbols-outlined text-[20px] select-none text-secondary">
                  folder_open
                </span>
                <span className="text-body-md">My Files (Root / Mặc định)</span>
              </label>

              {/* Folder list */}
              {folders.length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-2 px-1">
                    Or select a folder:
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {folders.map((folder) => (
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
                          name="save-target-folder"
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
                    ))}
                  </div>
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
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save_alt</span>
                  Save
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default SaveToFolderModal;
