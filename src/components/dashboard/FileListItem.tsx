import React, { useState } from 'react';
import type { FileItem } from '../../features/dashboard/dashboard.mock';
import Badge from '../common/Badge';
import { getFileIconDetails } from '../../lib/fileHelpers';

export interface FileListItemProps {
  item: FileItem;
  onItemClick?: (item: FileItem) => void;
  onActionClick?: (item: FileItem, action: string, e: React.MouseEvent) => void;
  isSelected?: boolean;
  hasAnySelection?: boolean;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  isTrash?: boolean;
  isCommunity?: boolean;
  isShared?: boolean;
  isSharedByMe?: boolean;
}

export const FileListItem: React.FC<FileListItemProps> = ({
  item,
  onItemClick,
  onActionClick,
  isSelected = false,
  hasAnySelection = false,
  onToggleSelect,
  isTrash = false,
  isCommunity = false,
  isShared = false,
  isSharedByMe = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const { name, type, tags = [], owner, lastModified, size, isPublic, tagDetails = [] } = item;
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = React.useRef(false);

  const startLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (onToggleSelect) {
        onToggleSelect(item.id, e as unknown as React.MouseEvent);
      }
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    if (hasAnySelection) {
      if (onToggleSelect) onToggleSelect(item.id, e);
      return;
    }
    if (onItemClick) onItemClick(item);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onActionClick) onActionClick(item, action, e);
  };

  const iconDetails = getFileIconDetails(name, type);
  const maxVisibleTags = 2;
  const visibleTags = tags.slice(0, maxVisibleTags);
  const extraTagsCount = tags.length - maxVisibleTags;

  const formatColorStyle = (colorCode: string) => {
    const cleanColor = colorCode.startsWith('#') ? colorCode : `#${colorCode}`;
    return {
      backgroundColor: `${cleanColor}15`, // ~8% opacity
      color: cleanColor,
      borderColor: `${cleanColor}30`, // ~18% opacity
    };
  };

  return (
    <div
      onClick={handleRowClick}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      className={`group grid grid-cols-[minmax(0,1fr)_4rem] md:grid-cols-[minmax(12rem,1fr)_7rem_7rem_4.5rem_4rem] items-center gap-x-3 px-3 py-2.5 hover:bg-surface-container-low rounded-xl cursor-pointer transition-colors border relative select-none ${
        isSelected
          ? 'bg-primary/10 border-primary/40'
          : 'border-transparent hover:border-outline-variant/30'
      }`}
    >
      {/* Title & Icons */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Selection Checkbox (visible when item is selected or selection mode is active) */}
        {(hasAnySelection || isSelected) && (
          <div
            className="flex items-center justify-center shrink-0 transition-opacity duration-150"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleSelect) onToggleSelect(item.id, e);
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary/20 cursor-pointer"
            />
          </div>
        )}

        <span className={`material-symbols-outlined select-none text-[22px] ${iconDetails.classes}`}>
          {iconDetails.name}
        </span>
        <span className="font-body-md text-body-md text-on-surface font-medium truncate">
          {name}
        </span>

        {/* Unread indicator for shared files */}
        {isShared && item.isUnread && (
          <span
            className="inline-flex items-center gap-1 bg-error/15 text-error px-2 py-0.5 rounded-full text-[10px] font-bold border border-error/30 shrink-0 select-none"
            title="New shared document"
          >
            <span className="w-1.5 h-1.5 bg-error rounded-full" />
            NEW
          </span>
        )}

        {/* Visibility indicator */}
        {type === 'file' && (
          <span 
            className="material-symbols-outlined text-[15px] text-secondary select-none shrink-0"
            title={isPublic ? 'Public Document' : 'Private Document'}
          >
            {isPublic ? 'public' : 'lock'}
          </span>
        )}
        
        {tags.length > 0 && (
          <div className="flex gap-1 ml-2 overflow-hidden flex-wrap max-h-5 hidden md:flex items-center">
            {visibleTags.map((tag) => {
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
                <Badge
                  key={tag}
                  variant={
                    tag === 'Urgent' ? 'error' : tag === 'Design' || tag === 'UI/UX' ? 'secondary' : 'primary'
                  }
                >
                  {tag}
                </Badge>
              );
            })}
            {extraTagsCount > 0 && (
              <Badge variant="secondary">
                +{extraTagsCount}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Metadata (Hidden on Mobile) */}
      <div className="contents">
        <span 
          className="hidden md:block font-body-md text-body-md text-secondary text-right truncate select-none"
          title={isSharedByMe ? item.sharedWith : owner}
        >
          {isSharedByMe ? item.sharedWith || 'Link only' : owner}
        </span>
        <span className="hidden md:block font-body-md text-body-md text-secondary text-right truncate select-none">
          {lastModified}
        </span>
        <span className="hidden md:block font-body-md text-body-md text-secondary text-right truncate select-none">
          {size}
        </span>
      </div>

      {/* Row Action Controls */}
      <div className="flex items-center justify-end gap-1 min-w-0">
        {/* Star Icon Button (Inline Toggle) */}
        {!isTrash && !isCommunity && (
          <button
            onClick={(e) => handleAction('toggle_star', e)}
            className={`p-1.5 rounded cursor-pointer transition-all duration-150 select-none ${
              item.isStarred
                ? 'text-[#f59e0b]'
                : 'text-secondary opacity-0 group-hover:opacity-100 hover:text-on-surface hover:bg-surface-container-highest'
            }`}
            title={item.isStarred ? 'Unstar' : 'Star'}
          >
            <span className={`material-symbols-outlined text-[18px] ${item.isStarred ? 'icon-fill' : ''}`}>
              star
            </span>
          </button>
        )}

        <button
          onClick={handleMenuToggle}
          className="p-1 text-secondary hover:text-on-surface hover:bg-surface-container-highest rounded cursor-pointer select-none"
        >
          <span className="material-symbols-outlined text-[20px] select-none">
            more_vert
          </span>
        </button>

        {showMenu && (
          <>
            {/* Backdrop overlay to close menu */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            {/* Action Popup */}
            <div className="absolute right-2 top-10 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-1.5 w-44 z-50 animate-in fade-in zoom-in duration-100">
              {isTrash ? (
                <>
                  <button
                    onClick={(e) => handleAction('restore', e)}
                    className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">restore</span> Restore
                  </button>
                  <button
                    onClick={(e) => handleAction('delete_permanent', e)}
                    className="w-full text-left px-3 py-1.5 text-xs text-error hover:bg-error-container/30 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-error">delete_forever</span> Delete Permanently
                  </button>
                </>
              ) : isCommunity || (isShared && !isSharedByMe) ? (
                <>
                  <button
                    onClick={(e) => handleAction('open', e)}
                    className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span> Open
                  </button>
                  <button
                    onClick={(e) => handleAction('save_to_my_files', e)}
                    className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">folder_open</span> Save to My Files
                  </button>
                  {isShared && (
                    <button
                      onClick={(e) => handleAction('remove_shared', e)}
                      className="w-full text-left px-3 py-1.5 text-xs text-error hover:bg-error-container/30 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px] text-error">person_remove</span> Remove from Shared
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={(e) => handleAction('open', e)}
                    className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span> Open
                  </button>
                  <button
                    onClick={(e) => handleAction('rename', e)}
                    className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span> Rename
                  </button>
                  
                  {type === 'file' && (
                    <>
                      <button
                        onClick={(e) => handleAction('share', e)}
                        className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">share</span> Share...
                      </button>
                      <button
                        onClick={(e) => handleAction('toggle_star', e)}
                        className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">star</span>
                        {item.isStarred ? 'Unstar' : 'Star'}
                      </button>
                      <button
                        onClick={(e) => handleAction('move_to', e)}
                        className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">drive_file_move</span> Move to Folder...
                      </button>
                      {item.folderId !== null && item.folderId !== undefined && (
                        <button
                          onClick={(e) => handleAction('move_out', e)}
                          className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[16px]">logout</span> Move out of Folder
                        </button>
                      )}
                      
                      <div className="border-t border-outline-variant/60 my-1" />
                      <div className="px-3 py-1 text-[10px] font-bold text-secondary uppercase tracking-wider select-none flex items-center gap-1">
                        <span>Visibility:</span>
                        <span className="text-on-surface">{isPublic ? 'Public 🌐' : 'Private 🔒'}</span>
                      </div>
                      <button
                        onClick={(e) => handleAction('toggle_visibility', e)}
                        className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isPublic ? 'lock' : 'public'}
                        </span>
                        {isPublic ? 'Make Private' : 'Make Public'}
                      </button>
                    </>
                  )}

                  {type === 'folder' && (
                    <button
                      onClick={(e) => handleAction('toggle_star', e)}
                      className="w-full text-left px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">star</span>
                      {item.isStarred ? 'Unstar' : 'Star'}
                    </button>
                  )}

                  <div className="border-t border-outline-variant/60 my-1" />
                  <button
                    onClick={(e) => handleAction('delete', e)}
                    className="w-full text-left px-3 py-1.5 text-xs text-error hover:bg-error-container/30 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-error">delete</span> Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default FileListItem;
