import React, { useEffect, useState } from 'react';
import subscriptionService from '../../services/subscriptionService';
import type { UserPaymentHistory } from '../../services/subscriptionService';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<UserPaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await subscriptionService.getMyPaymentHistory();
        if (response.data && response.data.success) {
          // Sort descending by date
          const sorted = response.data.data.sort((a, b) => 
            new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime()
          );
          setHistory(sorted);
        } else {
          setError(response.error || 'Failed to load billing history.');
        }
      } catch (err) {
        console.error('Error fetching billing history:', err);
        setError('An unexpected error occurred while loading your billing history.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen]);

  const totalSpent = history
    .filter(record => record.status?.toUpperCase() === 'SUCCESS')
    .reduce((sum, record) => sum + record.amount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center select-none p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-scrim/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
      />

      {/* Dialog container */}
      <div className="relative w-full max-w-lg bg-surface-container-low border border-outline-variant rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">receipt_long</span>
            <h3 className="font-title-lg text-title-lg font-bold text-on-surface">Billing History</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-secondary hover:text-on-surface hover:bg-surface-container rounded-full cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-secondary">
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm font-medium">Loading billing records...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-error-container text-on-error-container border border-error/20 rounded-xl text-center text-sm font-medium">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-secondary space-y-2">
              <span className="material-symbols-outlined text-[48px] text-outline">payments</span>
              <h4 className="font-semibold text-on-surface">No billing history found</h4>
              <p className="text-xs max-w-xs mx-auto">You have not purchased any premium subscription plans yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Card */}
              {totalSpent > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-secondary text-[11px] font-bold uppercase tracking-wider">Total Investment (Successful Tiers)</span>
                    <h4 className="font-title-md text-lg font-black text-primary mt-0.5">{formatCurrency(totalSpent)}</h4>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px] icon-fill">payments</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {history.map((record) => {
                  const isSuccess = record.status?.toUpperCase() === 'SUCCESS';
                  const isPending = record.status?.toUpperCase() === 'PENDING';
                  
                  return (
                    <div 
                      key={record.paymentId} 
                      className="border border-outline-variant rounded-xl p-4 bg-surface hover:bg-surface-container-lowest transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-on-surface uppercase tracking-wide">
                            {record.planName} Plan
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            isSuccess ? 'bg-primary/10 text-primary' : 
                            isPending ? 'bg-amber-500/10 text-amber-500' : 'bg-error/10 text-error'
                          }`}>
                            {record.status}
                          </span>
                        </div>
                        <div className="text-xs text-secondary flex flex-wrap gap-x-4">
                          <span>Method: <strong className="font-semibold text-on-surface">{record.paymentMethod}</strong></span>
                          <span>Date: <strong>{formatDate(record.paidAt)}</strong></span>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="font-title-md text-sm sm:text-base font-black text-on-surface">
                          {formatCurrency(record.amount)}
                        </span>
                        <div className="text-[10px] text-outline font-mono">ID: #{record.paymentId}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/60 flex justify-end bg-surface-container/20">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-outline text-secondary hover:bg-surface-container rounded-xl font-semibold cursor-pointer text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export default BillingModal;
