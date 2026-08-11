import React from 'react';
import type { FileItem } from '../../features/dashboard/dashboard.mock';
import FileListItem from './FileListItem';

export interface FileListProps {
  items: FileItem[];
  isLoading?: boolean;
  onItemClick?: (item: FileItem) => void;
  onItemActionClick?: (item: FileItem, action: string, e: React.MouseEvent) => void;
  selectedItemIds?: Set<string>;
  onToggleSelectItem?: (id: string, e: React.MouseEvent) => void;
  onToggleSelectAll?: () => void;
  isTrash?: boolean;
  isCommunity?: boolean;
  isShared?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

const getTimelineCategory = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Earlier';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const thisWeekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (d >= todayStart) return 'Today';
  if (d >= yesterdayStart) return 'Yesterday';
  if (d >= thisWeekStart) return 'This Week';
  return 'Earlier';
};

export const FileList: React.FC<FileListProps> = ({
  items,
  isLoading = false,
  onItemClick,
  onItemActionClick,
  selectedItemIds = new Set(),
  onToggleSelectItem,
  onToggleSelectAll,
  isTrash = false,
  isCommunity = false,
  isShared = false,
  emptyTitle = 'No documents yet',
  emptyDescription = 'Drag and drop files here, or use the Upload button to get started.',
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="font-body-md text-secondary select-none">Loading your files...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-xl border border-dashed border-outline-variant/60">
        <span className="material-symbols-outlined text-[48px] text-secondary/50 mb-3 select-none">
          folder_open
        </span>
        <h4 className="font-title-lg text-on-surface font-semibold select-none">{emptyTitle}</h4>
        <p className="font-body-md text-secondary mt-1 select-none">
          {emptyDescription}
        </p>
      </div>
    );
  }

  const isAllSelected = items.length > 0 && selectedItemIds.size === items.length;
  const hasAnySelection = selectedItemIds.size > 0;

  // Group items by timeline if in Shared or Community tab
  const timelineCategories = ['Today', 'Yesterday', 'This Week', 'Earlier'];
  const groupedItems: Record<string, FileItem[]> = {};

  if (isShared || isCommunity) {
    items.forEach((item) => {
      const category = getTimelineCategory(item.lastModified);
      if (!groupedItems[category]) {
        groupedItems[category] = [];
      }
      groupedItems[category].push(item);
    });
  }

  return (
    <section>
      {/* Table Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_4rem] md:grid-cols-[minmax(12rem,1fr)_7rem_7rem_4.5rem_4rem] items-center gap-x-3 border-b border-surface-variant pb-2 mb-4 px-2.5 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <label className="flex items-center gap-1.5 cursor-pointer font-label-md text-label-md text-secondary hover:text-on-surface select-none shrink-0">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={() => onToggleSelectAll && onToggleSelectAll()}
              className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary/20 cursor-pointer"
            />
            <span>
              Select All
              {selectedItemIds.size > 0 && (
                <span className="ml-1 text-on-surface font-bold">
                  ({selectedItemIds.size} selected)
                </span>
              )}
            </span>
          </label>

          <div className="flex items-center gap-1 min-w-0 ml-1">
            <span className="font-label-md text-label-md text-secondary hover:text-on-surface cursor-pointer">
              Name
            </span>
            <span className="material-symbols-outlined text-[16px] text-secondary cursor-pointer select-none">
              arrow_downward
            </span>
          </div>
        </div>
        
        <span className="hidden md:block font-label-md text-label-md text-secondary text-right">Owner</span>
        <span className="hidden md:block font-label-md text-label-md text-secondary text-right">Last modified</span>
        <span className="hidden md:block font-label-md text-label-md text-secondary text-right">File size</span>
        <span className="block" aria-hidden="true" />
      </div>

      {/* List Items (Timeline Grouping if Shared or Community) */}
      {isShared || isCommunity ? (
        <div className="space-y-6">
          {timelineCategories.map((category) => {
            const categoryItems = groupedItems[category];
            if (!categoryItems || categoryItems.length === 0) return null;

            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center gap-2 pb-2 text-xs font-bold text-primary uppercase tracking-wider select-none border-b border-outline-variant/30">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  <span>{category}</span>
                  <span className="text-secondary font-normal">({categoryItems.length})</span>
                </div>

                <div className="space-y-1 pt-1">
                  {categoryItems.map((item) => (
                    <FileListItem
                      key={item.id}
                      item={item}
                      onItemClick={onItemClick}
                      onActionClick={onItemActionClick}
                      isSelected={selectedItemIds.has(item.id)}
                      hasAnySelection={hasAnySelection}
                      onToggleSelect={onToggleSelectItem}
                      isTrash={isTrash}
                      isCommunity={isCommunity}
                      isShared={isShared}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <FileListItem
              key={item.id}
              item={item}
              onItemClick={onItemClick}
              onActionClick={onItemActionClick}
              isSelected={selectedItemIds.has(item.id)}
              hasAnySelection={hasAnySelection}
              onToggleSelect={onToggleSelectItem}
              isTrash={isTrash}
              isCommunity={isCommunity}
              isShared={isShared}
            />
          ))}
        </div>
      )}
    </section>
  );
};
export default FileList;
