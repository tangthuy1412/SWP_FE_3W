import React from 'react';
import type { SuggestedItem } from '../../features/dashboard/dashboard.mock';
import SuggestedFileCard from './SuggestedFileCard';

export interface SuggestedFilesSectionProps {
  items: SuggestedItem[];
  onAiActionClick?: (item: SuggestedItem, e: React.MouseEvent) => void;
  onItemClick?: (item: SuggestedItem) => void;
}

export const SuggestedFilesSection: React.FC<SuggestedFilesSectionProps> = ({
  items,
  onAiActionClick,
  onItemClick,
}) => {
  return (
    <section>
      <h3 className="font-title-lg text-title-lg font-semibold text-on-surface mb-4">
        Suggested
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <SuggestedFileCard
            key={item.id}
            item={item}
            onAiActionClick={onAiActionClick}
            onClick={onItemClick}
          />
        ))}
      </div>
    </section>
  );
};
export default SuggestedFilesSection;
