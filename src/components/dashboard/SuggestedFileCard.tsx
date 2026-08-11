import React from 'react';
import type { SuggestedItem } from '../../features/dashboard/dashboard.mock';
import Badge from '../common/Badge';

export interface SuggestedFileCardProps {
  item: SuggestedItem;
  onAiActionClick?: (item: SuggestedItem, e: React.MouseEvent) => void;
  onClick?: (item: SuggestedItem) => void;
}

export const SuggestedFileCard: React.FC<SuggestedFileCardProps> = ({
  item,
  onAiActionClick,
  onClick,
}) => {
  const {
    name,
    type,
    icon,
    previewUrl,
    tags = [],
    statusText,
    description,
    metadata,
    avatars = [],
    tagDetails = [],
  } = item;

  const handleAiClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAiActionClick) onAiActionClick(item, e);
  };

  const handleCardClick = () => {
    if (onClick) onClick(item);
  };

  const formatColorStyle = (colorCode: string) => {
    const cleanColor = colorCode.startsWith('#') ? colorCode : `#${colorCode}`;
    return {
      backgroundColor: `${cleanColor}15`, // ~8% opacity
      color: cleanColor,
      borderColor: `${cleanColor}30`, // ~18% opacity
    };
  };

  // 1. Render Team Workspace (spans 2 columns, Bento style)
  if (type === 'workspace') {
    return (
      <div
        onClick={handleCardClick}
        className="group bg-surface rounded-xl border border-surface-variant shadow-[0px_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 overflow-hidden cursor-pointer relative flex flex-col h-48 sm:col-span-2 lg:col-span-2"
      >
        <div className="absolute inset-0 z-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiM4ZTcxNjQiLz48L3N2Zz4=')]" />
        
        <div className="p-4 z-10 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 bg-secondary-container/50 px-2 py-1 rounded w-fit">
              <span className="material-symbols-outlined text-[16px] text-secondary icon-fill select-none">
                {icon}
              </span>
              <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">
                {statusText}
              </span>
            </div>
            
            {avatars.length > 0 && (
              <div className="flex -space-x-2">
                {avatars.map((avatar, idx) => (
                  <div key={idx} className="w-6 h-6 rounded-full bg-surface border-2 border-surface overflow-hidden">
                    <img src={avatar} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-title-lg text-title-lg font-bold text-on-surface group-hover:text-primary transition-colors truncate">
              {name}
            </h4>
            {description && (
              <p className="font-body-md text-body-md text-secondary mt-1 line-clamp-1">
                {description}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <span className="font-mono-label text-[11px] text-secondary">
              {metadata}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Standard Bento Item (Presentation or Document card)
  return (
    <div
      onClick={handleCardClick}
      className="group bg-surface rounded-2xl border border-surface-variant hover:border-outline-variant/60 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-pointer flex flex-col h-48 relative overflow-hidden"
    >
      {previewUrl ? (
        // Preview image header
        <div className="h-28 bg-surface-container-highest border-b border-surface-variant relative overflow-hidden">
          <img
            src={previewUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none"
          />
        </div>
      ) : (
        // Giant file icon header
        <div className="h-28 bg-surface-container-highest border-b border-surface-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-display-lg text-primary/40 group-hover:text-primary/60 transition-colors icon-fill select-none">
            {icon}
          </span>
        </div>
      )}

      {/* Card Info Section */}
      <div className="p-3 flex-1 flex flex-col justify-between overflow-hidden">
        <div>
          <h4 className="font-label-md text-label-md text-on-surface truncate group-hover:text-primary transition-colors">
            {name}
          </h4>
          {tags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {tags.map((tag) => {
                const details = tagDetails.find((t) => t.name.trim().toLowerCase() === tag.trim().toLowerCase());
                if (details && details.color) {
                  const colorStyle = formatColorStyle(details.color);
                  return (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-medium border select-none w-fit inline-flex items-center transition-colors"
                      style={colorStyle}
                    >
                      {tag}
                    </span>
                  );
                }
                return (
                  <Badge key={tag} variant={tag === 'Urgent' ? 'error' : tag === 'Draft' ? 'secondary' : 'primary'}>
                    {tag}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-2">
          <span className="font-mono-label text-[10px] text-secondary truncate">
            {statusText}
          </span>
          <button
            onClick={handleAiClick}
            className="opacity-0 group-hover:opacity-100 p-1 text-tertiary hover:bg-tertiary-fixed/30 rounded transition-all select-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] select-none">
              smart_toy
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuggestedFileCard;
