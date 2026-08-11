import React from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  variant?: 'danger' | 'info' | 'primary';
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  variant = 'danger',
  isConfirming = false,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation dialog"
        onClick={onCancel}
        disabled={isConfirming}
        className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-surface-variant bg-surface shadow-2xl animate-in zoom-in-95 fade-in duration-200"
      >
        <div className="p-6">
          <div
            className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${
              isDanger
                ? 'bg-error-container text-error'
                : 'bg-primary/15 text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[24px] select-none">
              {isDanger ? 'warning' : 'info'}
            </span>
          </div>
          <h3 id="confirm-modal-title" className="font-headline-md text-lg font-bold text-on-surface select-none">
            {title}
          </h3>
          <div className="mt-2 text-sm leading-6 text-secondary">{message}</div>
        </div>
        <div className="flex justify-end gap-3 border-t border-surface-variant bg-surface-container-low px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-lg px-4 py-2 text-sm font-bold text-secondary transition-colors hover:bg-surface-variant hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50 select-none cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 select-none cursor-pointer ${
              isDanger
                ? 'bg-error text-on-error shadow-md shadow-error/20 hover:bg-error/90'
                : 'bg-primary text-on-primary shadow-md shadow-primary/20 hover:bg-primary/90'
            }`}
          >
            {isConfirming ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
