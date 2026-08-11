import React, { useState, useEffect } from 'react';

export interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  itemType: 'file' | 'folder';
  onRename: (newName: string) => Promise<void>;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  onClose,
  currentName,
  itemType,
  onRename,
}) => {
  const [name, setName] = useState('');
  const [fileExtension, setFileExtension] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      if (itemType === 'file') {
        const lastDotIndex = currentName.lastIndexOf('.');
        if (lastDotIndex > 0) {
          setName(currentName.substring(0, lastDotIndex));
          setFileExtension(currentName.substring(lastDotIndex));
        } else {
          setName(currentName);
          setFileExtension('');
        }
      } else {
        setName(currentName);
        setFileExtension('');
      }
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, currentName, itemType]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(`${itemType === 'file' ? 'File' : 'Folder'} name cannot be empty.`);
      return;
    }
    const finalName = itemType === 'file' && fileExtension ? `${name.trim()}${fileExtension}` : name.trim();
    if (finalName === currentName.trim()) {
      onClose(); // No change
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onRename(finalName);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : `Failed to rename ${itemType}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-surface rounded-2xl border border-surface-variant max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-variant flex items-center justify-between select-none">
          <h3 className="font-title-lg text-title-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">edit</span>
            Rename {itemType === 'file' ? 'File' : 'Folder'}
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
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="rename-input" className="font-label-md text-label-md text-secondary select-none">
                New Name
              </label>
              
              <div className="flex rounded-lg border border-surface-variant bg-surface focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary overflow-hidden transition-all">
                <input
                  id="rename-input"
                  type="text"
                  placeholder={`Enter new ${itemType} name...`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1 h-11 bg-transparent px-4 text-body-md focus:outline-none"
                  autoFocus
                />
                {itemType === 'file' && fileExtension && (
                  <span className="flex items-center px-4 bg-surface-container-high border-l border-surface-variant font-mono text-body-md text-secondary select-none">
                    {fileExtension}
                  </span>
                )}
              </div>
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
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/90 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-primary/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-on-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RenameModal;
