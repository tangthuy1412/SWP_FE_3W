import React, { useEffect, useState } from 'react';
import subscriptionService from '../../services/subscriptionService';
import type { SubscriptionPlan, UserSubscription } from '../../services/subscriptionService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadSubscriptionData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [plansRes, subRes] = await Promise.all([
          subscriptionService.getSubscriptionPlans(),
          subscriptionService.getMySubscription(),
        ]);

        if (plansRes.data && plansRes.data.success) {
          // Sort plans by price ascending
          const sorted = [...plansRes.data.data].sort((a, b) => a.price - b.price);
          setPlans(sorted);
        } else {
          setError(plansRes.error || 'Failed to load subscription plans.');
        }

        if (subRes.data && subRes.data.success) {
          setCurrentSub(subRes.data.data);
        }
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError('An unexpected error occurred while loading subscription information.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionData();
  }, [isOpen]);

  const handlePurchase = async (planId: number) => {
    setIsPurchasing(planId);
    try {
      const response = await subscriptionService.purchasePlan(planId);
      if (response.data && response.data.success && response.data.data.paymentUrl) {
        // Redirect to VNPay
        window.open(response.data.data.paymentUrl, '_self');
      } else {
        alert(response.error || 'Failed to initiate purchase. Please try again.');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      alert('An error occurred during payment processing. Please try again.');
    } finally {
      setIsPurchasing(null);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center select-none">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Container */}
      <div className="relative bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-outline-variant p-6 md:p-8 animate-in zoom-in-95 duration-200 flex flex-col text-on-surface">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="font-title-lg text-title-lg font-bold">Choose Your Plan</h2>
            <p className="text-secondary text-sm mt-1">Unlock powerful AI tools and storage capacities tailored to your studies.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-on-surface hover:bg-surface-container rounded-full cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-error-container text-on-error-container border border-error/25 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-error">error</span>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-secondary text-sm font-medium">Loading premium plans...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = currentSub && currentSub.planName.toLowerCase() === plan.name.toLowerCase() && currentSub.status === 'ACTIVE';
              const isFree = plan.price === 0;
              const currentPrice = currentSub && currentSub.status === 'ACTIVE' ? currentSub.price : 0;
              const isDowngrade = plan.price < currentPrice;
              const isDisabled = isCurrent || isDowngrade || isPurchasing !== null;

              return (
                <div 
                  key={plan.id}
                  className={`relative flex flex-col bg-surface-container-low border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:border-primary/50 group ${
                    isCurrent 
                      ? 'border-2 border-primary ring-4 ring-primary/10' 
                      : 'border-outline-variant'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-primary text-on-primary font-label-md text-xs font-bold rounded-full shadow-sm">
                      Current Plan
                    </span>
                  )}

                  {/* Plan Name & Price */}
                  <div className="mb-4">
                    <h3 className="font-title-md text-title-md font-bold uppercase tracking-wide group-hover:text-primary transition-colors">
                      {plan.name}
                    </h3>
                    <div className="mt-2 flex items-baseline">
                      <span className="font-title-lg text-2xl font-black text-on-surface">
                        {formatPrice(plan.price)}
                      </span>
                      {!isFree && (
                        <span className="text-secondary text-xs font-medium ml-1.5">
                          / {plan.durationDays} days
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-secondary text-xs mt-2 min-h-[32px] line-clamp-2">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-outline-variant/60 my-4" />

                  {/* Plan Features */}
                  <ul className="space-y-3 flex-1 mb-6 text-sm">
                    <li className="flex items-center gap-2.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary text-[18px]">cloud</span>
                      <span><strong>{plan.storageLimitGb} GB</strong> Storage Limit</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary text-[18px]">upload_file</span>
                      <span>Max file size: <strong>{plan.maxUploadSizeMb} MB</strong></span>
                    </li>
                    {plan.monthlyTokenLimit > 0 ? (
                      <li className="flex items-center gap-2.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-primary text-[18px]">toll</span>
                        <span><strong>{plan.monthlyTokenLimit.toLocaleString()}</strong> AI tokens/mo</span>
                      </li>
                    ) : (
                      <li className="flex items-center gap-2.5 text-secondary">
                        <span className="material-symbols-outlined text-[18px]">toll</span>
                        <span>No monthly token limit</span>
                      </li>
                    )}
                    <li className="flex items-center gap-2.5 text-on-surface-variant">
                      <span className={`material-symbols-outlined text-[18px] ${plan.multipleDocuments ? 'text-primary' : 'text-secondary'}`}>
                        {plan.multipleDocuments ? 'check_circle' : 'cancel'}
                      </span>
                      <span className={plan.multipleDocuments ? '' : 'text-secondary line-through'}>
                        Multi-document chat
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5 text-on-surface-variant">
                      <span className={`material-symbols-outlined text-[18px] ${plan.videoUpload ? 'text-primary' : 'text-secondary'}`}>
                        {plan.videoUpload ? 'check_circle' : 'cancel'}
                      </span>
                      <span className={plan.videoUpload ? '' : 'text-secondary line-through'}>
                        Video file upload
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-xs text-on-surface-variant max-w-[200px]">
                        Formats: <span className="font-mono text-[10px] break-all">{plan.allowedFormats}</span>
                      </span>
                    </li>
                  </ul>

                  {/* Actions */}
                  {isFree ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl border border-outline bg-surface-container text-secondary text-sm font-semibold select-none"
                    >
                      Default Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchase(plan.id)}
                      disabled={isDisabled}
                      className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        isDisabled
                          ? 'border border-outline bg-surface-container text-secondary/60 cursor-not-allowed'
                          : 'bg-primary text-on-primary hover:bg-on-primary-fixed-variant shadow-[0_2px_4px_rgba(160,65,0,0.2)] active:scale-[0.98] cursor-pointer'
                      }`}
                    >
                      {isPurchasing === plan.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-on-primary/25 border-t-on-primary rounded-full animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : isCurrent ? (
                        'Active'
                      ) : isDowngrade ? (
                        'Downgrade Blocked'
                      ) : (
                        'Upgrade Plan'
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionModal;
