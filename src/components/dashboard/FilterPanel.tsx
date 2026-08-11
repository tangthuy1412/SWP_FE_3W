import React from 'react';
import type { TagResponse } from '../../services/tagService';
import type { DocumentFilterSort } from '../../services/documentService';

const CONTENT_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'All types', value: '' },
  { label: 'PDF', value: 'application/pdf' },
  { label: 'Word (.docx)', value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { label: 'Excel (.xlsx)', value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { label: 'PowerPoint (.pptx)', value: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  { label: 'PNG Image', value: 'image/png' },
  { label: 'JPEG Image', value: 'image/jpeg' },
];

export interface FilterPanelProps {
  availableTags: TagResponse[];
  selectedTagIds: number[];
  onTagsChange: (ids: number[]) => void;
  contentType: string;
  onContentTypeChange: (value: string) => void;
  createdFrom: string;
  onCreatedFromChange: (value: string) => void;
  createdTo: string;
  onCreatedToChange: (value: string) => void;
  sort: DocumentFilterSort;
  onSortChange: (value: DocumentFilterSort) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  availableTags,
  selectedTagIds,
  onTagsChange,
  contentType,
  onContentTypeChange,
  createdFrom,
  onCreatedFromChange,
  createdTo,
  onCreatedToChange,
  sort,
  onSortChange,
  onReset,
  hasActiveFilters,
}) => {
  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-surface-variant rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between">
          <h4 className="font-title-lg text-title-lg text-on-surface">Filter documents</h4>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="text-label-md text-primary font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Tags</label>
          {availableTags.length === 0 ? (
            <p className="text-body-md text-secondary text-sm">No tags yet.</p>
          ) : (
            <div className="max-h-32 overflow-y-auto scrollbar-thin border border-outline-variant/40 rounded-lg divide-y divide-outline-variant/30">
              {availableTags.map((tag) => {
                const cleanedColor = tag.color.startsWith('#') ? tag.color : `#${tag.color}`;
                const isChecked = selectedTagIds.includes(tag.tagId);
                return (
                  <label
                    key={tag.tagId}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-container-low cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleTag(tag.tagId)}
                      className="w-4 h-4 rounded border-surface-variant text-primary focus:ring-primary/20 cursor-pointer"
                    />
                    <span style={{ color: cleanedColor }} className="font-medium text-body-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cleanedColor }} />
                      {tag.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Content type */}
        <div className="space-y-1.5">
          <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Content type</label>
          <select
            value={contentType}
            onChange={(e) => onContentTypeChange(e.target.value)}
            className="w-full h-10 px-3 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-lg text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
          >
            {CONTENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Created from</label>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => onCreatedFromChange(e.target.value)}
              className="w-full h-10 px-3 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-lg text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Created to</label>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => onCreatedToChange(e.target.value)}
              className="w-full h-10 px-3 bg-surface-container-high focus:bg-surface border border-transparent focus:border-outline-variant rounded-lg text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="space-y-1.5">
          <label className="font-label-md text-on-surface-variant text-xs font-semibold block">Sort by</label>
          <div className="flex gap-2">
            {(['NEWEST', 'OLDEST'] as DocumentFilterSort[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSortChange(option)}
                className={`flex-1 h-9 rounded-lg text-label-md font-bold transition-colors cursor-pointer border ${
                  sort === option
                    ? 'bg-primary text-on-primary border-transparent'
                    : 'bg-surface-container-high text-on-surface border-transparent hover:border-outline-variant'
                }`}
              >
                {option === 'NEWEST' ? 'Newest' : 'Oldest'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
