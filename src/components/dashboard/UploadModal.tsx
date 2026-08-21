import React, { useState, useEffect, useRef } from 'react';
import { documentService } from '../../services/documentService';
import { tagService } from '../../services/tagService';
import subscriptionService from '../../services/subscriptionService';
import { normalizeTagColor } from '../../lib/tagColor';
import type { TagResponse } from '../../services/tagService';
import type { UserSubscription } from '../../services/subscriptionService';

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  folderId?: number | null;
}

/**
 * Điều phối form upload và các bước setup tài liệu sau upload.
 * Luồng runtime: chọn file -> validate phía client -> upload document vào folder hiện tại -> gắn tag.
 * Backend vẫn là nơi quyết định cuối cùng về loại file, giới hạn plan, storage và quyền upload video.
 */
export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  folderId = null,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<TagResponse[]>([]);
  const [availableTags, setAvailableTags] = useState<TagResponse[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Create tag inputs
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6f8f72');
  
  // Loading & uploading states
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available tags from database
  // Dữ liệu được load khi modal mở để user có thể gắn tag có sẵn vào tài liệu mới.
  const loadTags = async () => {
    try {
      const response = await tagService.getTags();
      if (response.data && response.data.success) {
        setAvailableTags(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadUploadLimit = async () => {
    setIsPlanLoading(true);
    try {
      const response = await subscriptionService.getMySubscription();
      if (response.data && response.data.success) {
        setSubscription(response.data.data);
      } else {
        setFileError('Could not verify upload access for your plan.');
      }
    } catch (error) {
      console.error('Failed to load upload limit:', error);
      setFileError('Could not verify upload access for your plan.');
    } finally {
      setIsPlanLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Mỗi lần mở form upload sẽ reset form và load lại dữ liệu plan/tag của user hiện tại.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadTags();
      loadUploadLimit();
      // Reset state
      setFile(null);
      setSelectedTags([]);
      setTagSearch('');
      setIsDropdownOpen(false);
      setNewTagName('');
      setNewTagColor('#6f8f72');
      setSubscription(null);
      setFileError(null);
    }
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // File size validation (plan limit for non-videos, 50MB for videos)
  const validateAndSetFile = (selectedFile: File) => {
    setFile(selectedFile);
    setFileError(null);

    if (isPlanLoading || !subscription) {
      setFileError('Your plan is still being checked. Please wait a moment and select the file again.');
      return;
    }

    if (selectedFile.size === 0) {
      setFileError('This file is empty and cannot be uploaded.');
      return;
    }

    const isVideo = selectedFile.type.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm|wmv|flv|3gp)$/i.test(selectedFile.name);
    const extension = selectedFile.name.includes('.') ? selectedFile.name.split('.').pop()!.toLowerCase() : '';
    const allowedExtensions = (subscription.allowedFormats || '')
      .split(/[,;|\s]+/)
      .map((format) => format.trim().toLowerCase().replace(/^\./, ''))
      .filter(Boolean);

    if (!extension || !allowedExtensions.includes(extension)) {
      setFileError(`${subscription.planName} does not support .${extension || 'unknown'} files. Allowed formats: ${allowedExtensions.map((format) => `.${format}`).join(', ') || 'none'}.`);
      return;
    }
    
    if (isVideo) {
      if (!subscription.videoUpload) {
        setFileError(`Video upload is not included in your ${subscription.planName} plan.`);
        return;
      }
      // Video dùng guard cố định ở frontend; backend sẽ kiểm tra riêng entitlement videoUpload của plan.
      const VIDEO_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB
      if (selectedFile.size > VIDEO_SIZE_LIMIT) {
        setFileError('This video exceeds the maximum upload size of 50 MB.');
        return;
      }
    } else {
      // File không phải video dùng kích thước tối đa từ subscription plan active của user nếu đã load được.
      if (selectedFile.size > subscription.maxUploadSizeMb * 1024 * 1024) {
        setFileError(`This file exceeds the ${subscription.maxUploadSizeMb} MB limit of your ${subscription.planName} plan.`);
        return;
      }
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  // Tag actions
  const handleToggleTag = (tag: TagResponse) => {
    const isSelected = selectedTags.some((t) => t.tagId === tag.tagId);
    if (isSelected) {
      setSelectedTags(selectedTags.filter((t) => t.tagId !== tag.tagId));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tagId: number) => {
    setSelectedTags(selectedTags.filter((t) => t.tagId !== tagId));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      alert('Please enter a tag name.');
      return;
    }
    setIsCreatingTag(true);
    try {
      const response = await tagService.createTag(newTagName.trim(), newTagColor);
      if (response.data && response.data.success) {
        const createdTag = response.data.data;
        setAvailableTags([...availableTags, createdTag]);
        setSelectedTags([...selectedTags, createdTag]);
        setNewTagName('');
      } else {
        alert(`Failed to create tag: ${response.error || 'Duplicate or invalid tag name'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error creating tag.');
    } finally {
      setIsCreatingTag(false);
    }
  };

  // Main Upload and tag link action
  const handleUpload = async () => {
    if (!file || fileError || !subscription) {
      alert('Please select a file to upload.');
      return;
    }
    setIsUploading(true);

    try {
      // 1. Upload the document
      const uploadResponse = await documentService.uploadDocument(file, false, folderId);
      if (uploadResponse.data && uploadResponse.data.success) {
        const docId = uploadResponse.data.data.documentId;
        
        if (selectedTags.length > 0) {
          for (const tag of selectedTags) {
            await tagService.addTagToDocument(docId, tag.tagId);
          }
        }

        window.dispatchEvent(new CustomEvent('aether-notification', { detail: {
          id: `upload-${docId}`,
          type: 'upload',
          title: 'Upload completed',
          message: `${file.name} was uploaded and is being prepared for AI.`,
          createdAt: new Date().toISOString(),
        } }));
        alert('File uploaded successfully!');
        onUploadSuccess();
        onClose();
      } else {
        alert(`Upload failed: ${uploadResponse.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  // Filter available tags for dropdown
  const filteredTags = availableTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1b1c1c]/40 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Card container */}
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-variant flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl icon-fill">upload_file</span>
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Upload Files</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-secondary hover:text-on-surface transition-colors p-1.5 hover:bg-surface-variant rounded-full cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group select-none ${
              dragging
                ? 'bg-surface-container-highest border-primary'
                : file
                ? 'bg-primary-fixed/5 border-primary/40'
                : 'border-outline-variant/50 bg-surface-container-low hover:bg-surface-container-high hover:border-primary/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.pptx,.xls,.xlsx,.png,.mp4,.mov,.avi,.webm,image/*,video/*"
              className="hidden"
            />
            <div className="w-14 h-14 bg-surface rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">
                {file ? 'check_circle' : 'cloud_upload'}
              </span>
            </div>
            
            {file ? (
              <div className="text-center space-y-1">
                <p className="text-body-lg font-bold text-on-surface truncate max-w-md">{file.name}</p>
                <p className="text-label-md text-primary font-medium font-mono-label">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <p className="text-xs text-secondary mt-2">Click or drag new file to replace</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-body-lg font-bold text-on-surface">Drag and drop your files here</p>
                <p className="text-body-md text-secondary mb-4">
                  {isPlanLoading
                    ? 'Checking the formats and limits included in your plan...'
                    : subscription
                      ? `${subscription.planName}: ${subscription.allowedFormats} · up to ${subscription.maxUploadSizeMb} MB${subscription.videoUpload ? ' · video included' : ''}`
                      : 'Plan permissions are unavailable'}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseClick();
                  }}
                  className="px-5 py-2 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary/5 active:scale-95 transition-all cursor-pointer"
                >
                  Browse files
                </button>
              </div>
            )}
          </div>

          {fileError && (
            <div className="flex flex-col gap-3 rounded-lg border border-error/30 bg-error-container/30 p-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <div className="flex min-w-0 items-start gap-2">
                <span className="material-symbols-outlined text-[20px] text-error">block</span>
                <div>
                  <p className="text-sm font-semibold text-error">This file cannot be uploaded</p>
                  <p className="mt-0.5 text-xs text-on-error-container">{fileError}</p>
                </div>
              </div>
              <button type="button" onClick={() => window.dispatchEvent(new Event('open-subscription-plans'))} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary">
                <span className="material-symbols-outlined text-[17px]">upgrade</span>
                View plans
              </button>
            </div>
          )}

          {/* Tag Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between select-none">
              <h4 className="font-title-lg text-title-lg text-on-surface">Assign Tags</h4>
              <span className="text-label-md text-secondary">{selectedTags.length} selected</span>
            </div>

            {/* Selected Tag Chips */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 py-1.5 animate-in fade-in duration-200">
                {selectedTags.map((tag) => {
                  const cleanedColor = normalizeTagColor(tag.color) || '#64748b';
                  return (
                    <span
                      key={tag.tagId}
                      style={{
                        backgroundColor: `${cleanedColor}15`,
                        color: cleanedColor,
                        borderColor: `${cleanedColor}40`,
                      }}
                      className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 font-bold text-body-md rounded-lg border group transition-all"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag.tagId)}
                        className="material-symbols-outlined text-base rounded-full p-0.5 cursor-pointer opacity-80 hover:opacity-100 hover:bg-black/10 transition-all"
                      >
                        close
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Available Tags Dropdown list */}
            <div ref={dropdownRef} className="relative w-full">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary select-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Select or search tags..."
                  value={tagSearch}
                  onChange={(e) => {
                    setTagSearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-surface border border-surface-variant rounded-lg py-2.5 pl-10 pr-10 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary select-none transition-transform duration-200 cursor-pointer p-0.5 hover:bg-surface-container rounded-full"
                >
                  {isDropdownOpen ? 'expand_less' : 'expand_more'}
                </button>
              </div>

              {/* Dropdown Box */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-1.5 bg-surface border border-surface-variant rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="max-h-52 overflow-y-auto scrollbar-thin py-1 select-none">
                    {filteredTags.length > 0 ? (
                      filteredTags.map((tag) => {
                        const isChecked = selectedTags.some((t) => t.tagId === tag.tagId);
                        const cleanedColor = normalizeTagColor(tag.color) || '#64748b';
                        return (
                          <label
                            key={tag.tagId}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleTag(tag)}
                              className="w-4.5 h-4.5 rounded border-surface-variant text-primary focus:ring-primary/20 cursor-pointer"
                            />
                            <span
                              style={{ color: cleanedColor }}
                              className="font-medium text-body-md flex items-center gap-1.5"
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cleanedColor }} />
                              {tag.name}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <div className="px-4 py-3 text-secondary text-body-md text-center">
                        No tags found. Create one below!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Create New Tag */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-3">
            <h4 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2 select-none">
              <span className="material-symbols-outlined text-secondary">sell</span>
              Create New Tag
            </h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="New tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                disabled={isCreatingTag}
                className="flex-1 h-11 bg-surface border border-surface-variant rounded-lg px-4 text-body-md focus:ring-2 focus:ring-primary/20 focus:outline-none focus:border-primary transition-all"
              />
              <div className="flex gap-3 items-center">
                {/* Color picker */}
                <div className="relative w-11 h-11 border border-surface-variant rounded-lg overflow-hidden bg-surface shrink-0">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    disabled={isCreatingTag}
                    className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer scale-125 origin-center"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={isCreatingTag || !newTagName.trim()}
                  className="h-11 px-4 bg-surface border border-surface-variant text-secondary hover:text-primary hover:border-primary font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Create Tag
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-5 bg-surface-container-low border-t border-surface-variant flex items-center justify-end gap-3 select-none">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-5 py-2.5 text-secondary font-bold hover:text-on-surface hover:bg-surface-variant rounded-lg transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || isPlanLoading || !file || !!fileError || !subscription}
            className="px-8 py-2.5 bg-primary text-on-primary font-bold rounded-lg shadow-[0px_4px_20px_rgba(255,107,0,0.2)] hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Upload
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default UploadModal;
