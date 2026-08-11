import React from 'react';
import type { StorageUsage } from '../../features/dashboard/dashboard.mock';

export interface StorageUsageCardProps {
  storage?: StorageUsage;
}

export const StorageUsageCard: React.FC<StorageUsageCardProps> = ({ storage }) => {
  if (!storage) return null;

  const { usedPercentage, formattedUsed, formattedTotal } = storage;

  return (
    <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low/60 p-3">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-[20px] text-primary">cloud_queue</span>
          <div>
            <p className="text-sm font-semibold">Storage</p>
            <p className="text-[11px] text-secondary">{formattedUsed} of {formattedTotal}</p>
          </div>
        </div>
        <span className="rounded-full bg-primary-fixed px-2 py-1 text-[10px] font-semibold text-primary">
          {usedPercentage}% used
        </span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${usedPercentage}%` }}
        />
      </div>

    </div>
  );
};
export default StorageUsageCard;
