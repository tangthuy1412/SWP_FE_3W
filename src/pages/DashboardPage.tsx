import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import FileList from "../components/dashboard/FileList";
import UploadModal from "../components/dashboard/UploadModal";
import { documentService } from "../services/documentService";
import type {
  DocumentUploadResponse,
  DocumentFilterSort,
} from "../services/documentService";
import { tagService } from "../services/tagService";
import type { TagResponse } from "../services/tagService";
import { folderService } from "../services/folderService";
import type { DocumentFolderResponse } from "../services/folderService";
import subscriptionService from "../services/subscriptionService";
import CreateFolderModal from "../components/dashboard/CreateFolderModal";
import Button from "../components/common/Button";
import ConfirmModal from "../components/common/ConfirmModal";
import { useConfirm } from "../contexts/ConfirmContext";
import RenameModal from "../components/dashboard/RenameModal";
import MoveToFolderModal from "../components/dashboard/MoveToFolderModal";
import SaveToFolderModal from "../components/dashboard/SaveToFolderModal";
import FriendsView from "../components/dashboard/FriendsView";
import SettingsView from "../components/dashboard/SettingsView";
import FilterPanel from "../components/dashboard/FilterPanel";
import AiAssistantConfigView from "../components/dashboard/AiAssistantConfigView";
import SmartChatView from "../components/dashboard/SmartChatView";
import ShareModal from "../components/dashboard/ShareModal";
import AdminPlansView from "../components/dashboard/AdminPlansView";
import DocumentChat from "../components/document/DocumentChat";
import { getFileIconDetails } from "../lib/fileHelpers";
import { saveKnownUser, resolveOwnerEmail } from "../lib/userHelpers";
import { getReadSharedDocIds, markSharedDocAsRead } from "../lib/sharedDocReadDb";
import { mockFileItems } from "../features/dashboard/dashboard.mock";
import type { FileItem } from "../features/dashboard/dashboard.mock";

interface DocumentWithTags extends DocumentUploadResponse {
  tags?: string[];
  tagDetails?: { name: string; color: string }[];
  sharedWith?: string;
  shareCount?: number;
}

// Utility helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const DashboardPage: React.FC = () => {
  const confirmAction = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve navigation state if returning from document detail view
  const navigationState = location.state as {
    activeTab?: string;
    folderId?: number | null;
    folderName?: string | null;
  } | null;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = navigationState?.activeTab || sessionStorage.getItem("dashboardActiveTab") || "My Files";
    return (requestedTab === "AI Assistant" || requestedTab === "Admin") && localStorage.getItem("userRole") !== "ADMIN"
      ? "My Files"
      : requestedTab;
  });
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sharedView, setSharedView] = useState<"with-me" | "by-me">("with-me");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Real API states
  const [apiFiles, setApiFiles] = useState<DocumentWithTags[]>([]);
  const [apiFolders, setApiFolders] = useState<DocumentFolderResponse[]>([]);
  const [allFolders, setAllFolders] = useState<DocumentFolderResponse[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(() =>
    navigationState?.folderId !== undefined ? navigationState.folderId : null,
  );
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(
    () =>
      navigationState?.folderName !== undefined
        ? navigationState.folderName
        : null,
  );

  // Modal states
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<FileItem | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
    type: "file" | "folder";
  } | null>(null);
  const [isMoveToOpen, setIsMoveToOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<FileItem | null>(null);

  // Save To Folder modal state
  const [isSaveToOpen, setIsSaveToOpen] = useState(false);
  const [saveTarget, setSaveTarget] = useState<FileItem | null>(null);

  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{
    id: number;
    name: string;
    isPublic: boolean;
  } | null>(null);

  // Multi-selection state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Folder chat state
  const [isFolderChatOpen, setIsFolderChatOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("dashboardActiveTab", activeTab);
  }, [activeTab]);

  // Document filter state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isFilterModeActive, setIsFilterModeActive] = useState(false);
  const [filterTagIds, setFilterTagIds] = useState<number[]>([]);
  const [filterContentType, setFilterContentType] = useState("");
  const [filterCreatedFrom, setFilterCreatedFrom] = useState("");
  const [filterCreatedTo, setFilterCreatedTo] = useState("");
  const [filterSort, setFilterSort] = useState<DocumentFilterSort>("NEWEST");
  const [filterPage, setFilterPage] = useState(0);
  const [filteredItems, setFilteredItems] = useState<DocumentWithTags[]>([]);
  const [filterPageMeta, setFilterPageMeta] = useState<{
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  } | null>(null);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagResponse[]>([]);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters =
    filterTagIds.length > 0 ||
    filterContentType !== "" ||
    filterCreatedFrom !== "" ||
    filterCreatedTo !== "" ||
    filterSort !== "NEWEST";

  const isLoggedIn = !!localStorage.getItem("token");
  const isAdmin = localStorage.getItem("userRole") === "ADMIN";

  const [storageLimitGb, setStorageLimitGb] = useState<number>(2);
  const [allMyFilesSize, setAllMyFilesSize] = useState<number>(0);
  const [allSharedFilesSize, setAllSharedFilesSize] = useState<number>(0);

  const fetchStorageData = async () => {
    if (!isLoggedIn) return;
    try {
      const [subRes, myDocsRes, sharedDocsRes] = await Promise.all([
        subscriptionService.getMySubscription().catch(() => null),
        documentService.getMyDocuments().catch(() => null),
        documentService.getSharedWithMeDocuments().catch(() => null),
      ]);

      if (subRes && subRes.data && subRes.data.success && subRes.data.data) {
        setStorageLimitGb(subRes.data.data.storageLimitGb || 2);
      } else {
        setStorageLimitGb(2);
      }

      if (
        myDocsRes &&
        myDocsRes.data &&
        myDocsRes.data.success &&
        myDocsRes.data.data
      ) {
        const myTotal = myDocsRes.data.data.reduce(
          (sum, f) => sum + (f.fileSize || 0),
          0,
        );
        setAllMyFilesSize(myTotal);
      } else {
        setAllMyFilesSize(0);
      }

      if (
        sharedDocsRes &&
        sharedDocsRes.data &&
        sharedDocsRes.data.success &&
        sharedDocsRes.data.data
      ) {
        const sharedTotal = sharedDocsRes.data.data.reduce(
          (sum, f) => sum + (f.fileSize || 0),
          0,
        );
        setAllSharedFilesSize(sharedTotal);
      } else {
        setAllSharedFilesSize(0);
      }
    } catch (e) {
      console.error("Error fetching storage details:", e);
    }
  };

  // Load all folders list for move modal
  const loadAllFolders = async () => {
    try {
      const response = await folderService.getFolders();
      if (response.data && response.data.success) {
        setAllFolders(response.data.data);
      }
    } catch (e) {
      console.error("Failed to load folders list:", e);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAllFolders();
      fetchStorageData();

      const currentUserId = localStorage.getItem("userId");
      const currentFullName = localStorage.getItem("userFullName");
      const currentEmail = localStorage.getItem("userEmail");
      if (currentUserId && (currentFullName || currentEmail)) {
        saveKnownUser(currentUserId, currentFullName, currentEmail);
      }

      tagService.getTags().then((response) => {
        if (response.data && response.data.success) {
          setAvailableTags(response.data.data);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Close the filter panel on outside click
  useEffect(() => {
    if (!isFilterPanelOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target as Node)
      ) {
        setIsFilterPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterPanelOpen]);

  // Fetch filtered documents (debounced) whenever an active filter/sort/page changes
  useEffect(() => {
    if (!isFilterModeActive || !isLoggedIn) return;

    const timeoutId = setTimeout(async () => {
      setIsFilterLoading(true);
      const response = await documentService.filterMyDocuments({
        tagIds: filterTagIds,
        contentType: filterContentType || undefined,
        createdFrom: filterCreatedFrom
          ? `${filterCreatedFrom}T00:00:00Z`
          : undefined,
        createdTo: filterCreatedTo ? `${filterCreatedTo}T23:59:59Z` : undefined,
        sort: filterSort,
        page: filterPage,
        size: 20,
      });

      if (response.data && response.data.success) {
        const pageData = response.data.data;
        const docsWithTags = await Promise.all(
          pageData.documents.map(async (doc) => {
            try {
              const tagResponse = await tagService.getDocumentTags(
                doc.documentId,
              );
              if (tagResponse.data && tagResponse.data.success) {
                const tagNames = tagResponse.data.data.map((t) => t.name);
                const tagDetails = tagResponse.data.data.map((t) => ({
                  name: t.name,
                  color: t.color,
                }));
                return { ...doc, tags: tagNames, tagDetails };
              }
            } catch (e) {
              console.error(
                `Failed to load tags for document ${doc.documentId}:`,
                e,
              );
            }
            return { ...doc, tags: [], tagDetails: [] };
          }),
        );
        setFilteredItems(docsWithTags);
        setFilterPageMeta({
          page: pageData.page,
          size: pageData.size,
          totalElements: pageData.totalElements,
          totalPages: pageData.totalPages,
        });
      } else {
        alert(
          `Failed to load filtered documents: ${response.error || "Server error"}`,
        );
        setFilteredItems([]);
        setFilterPageMeta(null);
      }
      setIsFilterLoading(false);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [
    isFilterModeActive,
    filterTagIds,
    filterContentType,
    filterCreatedFrom,
    filterCreatedTo,
    filterSort,
    filterPage,
    isLoggedIn,
  ]);

  // Load files from backend
  const fetchFiles = async () => {
    // Guests can still browse the public Community collection.
    if (!isLoggedIn && activeTab !== "Community") {
      setApiFiles([]);
      setApiFolders([]);
      setIsFallbackMode(false);
      setIsLoadingFiles(false);
      return;
    }
    setIsLoadingFiles(true);
    fetchStorageData();

    try {
      if (currentFolderId !== null) {
        // Fetch documents in folder (applicable for both "My Files" and "Starred")
        setApiFolders([]); // No folders inside folders
        const docsResponse =
          await folderService.getFolderDocuments(currentFolderId);

        if (docsResponse.data && docsResponse.data.success) {
          const folderDocs = docsResponse.data.data;

          // Fetch tags for folder documents
          const docsWithTags = await Promise.all(
            folderDocs.map(async (doc) => {
              try {
                const tagResponse = await tagService.getDocumentTags(
                  doc.documentId,
                );
                if (tagResponse.data && tagResponse.data.success) {
                  const tagNames = tagResponse.data.data.map((t) => t.name);
                  const tagDetails = tagResponse.data.data.map((t) => ({
                    name: t.name,
                    color: t.color,
                  }));
                  return { ...doc, tags: tagNames, tagDetails };
                }
              } catch (e) {
                console.error(
                  `Failed to load tags for document ${doc.documentId}:`,
                  e,
                );
              }
              return { ...doc, tags: [], tagDetails: [] };
            }),
          );

          setApiFiles(docsWithTags);
          setIsFallbackMode(false);
        } else {
          console.warn(
            `Failed to fetch documents for folder ${currentFolderId}`,
          );
          setApiFiles([]);
        }
      } else if (activeTab === "My Files") {
        // Fetch folders and root documents in parallel
        const [foldersResponse, docsResponse] = await Promise.all([
          folderService.getFolders(),
          documentService.getMyDocuments(),
        ]);

        let rootDocs: DocumentUploadResponse[] = [];
        if (docsResponse.data && docsResponse.data.success) {
          // Filter root documents only
          rootDocs = docsResponse.data.data.filter(
            (doc) => doc.folderId === null,
          );
        }

        if (foldersResponse.data && foldersResponse.data.success) {
          setApiFolders(foldersResponse.data.data);
        } else {
          setApiFolders([]);
        }

        // Fetch tags for root documents
        const docsWithTags = await Promise.all(
          rootDocs.map(async (doc) => {
            try {
              const tagResponse = await tagService.getDocumentTags(
                doc.documentId,
              );
              if (tagResponse.data && tagResponse.data.success) {
                const tagNames = tagResponse.data.data.map((t) => t.name);
                const tagDetails = tagResponse.data.data.map((t) => ({
                  name: t.name,
                  color: t.color,
                }));
                return { ...doc, tags: tagNames, tagDetails };
              }
            } catch (e) {
              console.error(
                `Failed to load tags for document ${doc.documentId}:`,
                e,
              );
            }
            return { ...doc, tags: [], tagDetails: [] };
          }),
        );

        setApiFiles(docsWithTags);
        setIsFallbackMode(false);
      } else if (activeTab === "Starred") {
        const [foldersResponse, docsResponse] = await Promise.all([
          folderService.getStarredFolders(),
          documentService.getStarredDocuments(),
        ]);

        if (foldersResponse.data && foldersResponse.data.success) {
          setApiFolders(foldersResponse.data.data);
        } else {
          setApiFolders([]);
        }

        let starredDocs: DocumentUploadResponse[] = [];
        if (docsResponse.data && docsResponse.data.success) {
          starredDocs = docsResponse.data.data;
        }

        const docsWithTags = await Promise.all(
          starredDocs.map(async (doc) => {
            try {
              const tagResponse = await tagService.getDocumentTags(
                doc.documentId,
              );
              if (tagResponse.data && tagResponse.data.success) {
                const tagNames = tagResponse.data.data.map((t) => t.name);
                const tagDetails = tagResponse.data.data.map((t) => ({
                  name: t.name,
                  color: t.color,
                }));
                return { ...doc, tags: tagNames, tagDetails };
              }
            } catch (e) {
              console.error(
                `Failed to load tags for document ${doc.documentId}:`,
                e,
              );
            }
            return { ...doc, tags: [], tagDetails: [] };
          }),
        );
        setApiFiles(docsWithTags);
        setIsFallbackMode(false);
      } else if (activeTab === "Community") {
        setApiFolders([]);
        const docsResponse = await documentService.getPublicDocuments();

        let publicDocs: DocumentUploadResponse[] = [];
        if (docsResponse.data && docsResponse.data.success) {
          publicDocs = docsResponse.data.data;
        }

        const docsWithTags = await Promise.all(
          publicDocs.map(async (doc) => {
            try {
              const tagResponse = await tagService.getPublicDocumentTags(
                doc.documentId,
              );
              if (tagResponse.data && tagResponse.data.success) {
                const tagNames = tagResponse.data.data.map((t) => t.name);
                const tagDetails = tagResponse.data.data.map((t) => ({
                  name: t.name,
                  color: t.color,
                }));
                return { ...doc, tags: tagNames, tagDetails };
              }
            } catch (e) {
              console.error(
                `Failed to load tags for document ${doc.documentId}:`,
                e,
              );
            }
            return { ...doc, tags: [], tagDetails: [] };
          }),
        );
        setApiFiles(docsWithTags);
        setIsFallbackMode(false);
      } else if (activeTab === "Trash") {
        const [foldersResponse, docsResponse] = await Promise.all([
          folderService.getTrashFolders(),
          documentService.getTrashDocuments(),
        ]);

        if (foldersResponse.data && foldersResponse.data.success) {
          setApiFolders(foldersResponse.data.data);
        } else {
          setApiFolders([]);
        }

        let trashDocs: DocumentUploadResponse[] = [];
        if (docsResponse.data && docsResponse.data.success) {
          trashDocs = docsResponse.data.data.filter((doc) => doc.folderId === null);
        }

        const docsWithTags = await Promise.all(
          trashDocs.map(async (doc) => {
            try {
              const tagResponse = await tagService.getDocumentTags(
                doc.documentId,
              );
              if (tagResponse.data && tagResponse.data.success) {
                const tagNames = tagResponse.data.data.map((t) => t.name);
                const tagDetails = tagResponse.data.data.map((t) => ({
                  name: t.name,
                  color: t.color,
                }));
                return { ...doc, tags: tagNames, tagDetails };
              }
            } catch (e) {
              console.error(
                `Failed to load tags for document ${doc.documentId}:`,
                e,
              );
            }
            return { ...doc, tags: [], tagDetails: [] };
          }),
        );
        setApiFiles(docsWithTags);
        setIsFallbackMode(false);
      } else if (activeTab === "Shared") {
        setApiFolders([]);
        if (sharedView === "by-me") {
          const myDocumentsResponse = await documentService.getMyDocuments();
          const myDocuments = myDocumentsResponse.data?.success ? myDocumentsResponse.data.data : [];
          const documentsWithRecipients = await Promise.all(
            myDocuments.map(async (doc) => {
              const sharesResponse = await documentService.getDocumentShares(doc.documentId).catch(() => null);
              const shares = sharesResponse?.data?.success ? sharesResponse.data.data : [];
              if (shares.length === 0) return null;
              const recipientNames = shares.map((share) => share.sharedWithName || share.sharedWithEmail);
              return {
                ...doc,
                sharedWith: recipientNames.slice(0, 2).join(", ") + (recipientNames.length > 2 ? ` +${recipientNames.length - 2}` : ""),
                shareCount: recipientNames.length,
                tags: [],
                tagDetails: [],
              } as DocumentWithTags;
            }),
          );
          setApiFiles(documentsWithRecipients.filter((doc): doc is DocumentWithTags => doc !== null));
          setIsFallbackMode(false);
          setIsLoadingFiles(false);
          return;
        }

        const docsResponse = await documentService.getSharedWithMeDocuments();

        let sharedDocs: DocumentUploadResponse[] = [];
        if (docsResponse.data && docsResponse.data.success) {
          sharedDocs = docsResponse.data.data;
        }

        const docsWithTags = await Promise.all(
          sharedDocs.map(async (doc) => {
            try {
              const tagResponse = await tagService.getDocumentTags(
                doc.documentId,
              );
              if (tagResponse.data && tagResponse.data.success) {
                const tagNames = tagResponse.data.data.map((t) => t.name);
                const tagDetails = tagResponse.data.data.map((t) => ({
                  name: t.name,
                  color: t.color,
                }));
                return { ...doc, tags: tagNames, tagDetails };
              }
            } catch (e) {
              console.error(
                `Failed to load tags for document ${doc.documentId}:`,
                e,
              );
            }
            return { ...doc, tags: [], tagDetails: [] };
          }),
        );
        setApiFiles(docsWithTags);
        setIsFallbackMode(false);
      } else if (activeTab === "Friends" || activeTab === "Settings") {
        setApiFiles([]);
        setApiFolders([]);
        setIsLoadingFiles(false);
        return;
      } else {
        setApiFiles([]);
        setApiFolders([]);
        setIsFallbackMode(false);
      }
    } catch (e) {
      console.warn("Could not load documents from the API.", e);
      setApiFiles([]);
      setApiFolders([]);
      setIsFallbackMode(false);
    }
    setIsLoadingFiles(false);
  };

  useEffect(() => {
    // Load lại danh sách document đang hiển thị sau khi đổi tab/folder hoặc upload thành công.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, activeTab, sharedView]);

  // Removed useEffect resetting folder on tab change to allow state preservation.
  // Resets are handled directly in handleTabChange.

  // Map backend files to frontend FileItems
  const mapApiFileToFileItem = (doc: DocumentWithTags): FileItem => {
    const currentUserId = Number(localStorage.getItem("userId")) || null;
    const readSharedDocIds = getReadSharedDocIds(currentUserId);
    const fileType = doc.contentType.startsWith("image/")
      ? "image"
      : doc.contentType.includes("pdf") ||
          doc.contentType.includes("word") ||
          doc.contentType.includes("officedocument")
        ? "document"
        : "file";

    const isUnread =
      activeTab === "Shared" || (currentUserId !== null && doc.userId !== currentUserId)
        ? !readSharedDocIds.has(doc.documentId)
        : false;

    return {
      id: String(doc.documentId),
      name: doc.originalFileName,
      type: "file",
      fileType,
      icon: fileType === "image" ? "image" : "description",
      tags: doc.tags || [],
      owner: doc.ownerEmail || resolveOwnerEmail(doc.userId),
      lastModified: new Date(doc.uploadedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      size: formatBytes(doc.fileSize),
      isPublic: doc.isPublic,
      isStarred: doc.isStarred,
      isUnread,
      tagDetails: doc.tagDetails || [],
      folderId: doc.folderId,
      sharedWith: doc.sharedWith,
      shareCount: doc.shareCount,
      processingStatus: doc.status,
    };
  };

  // Compile final file list: folders + documents, or mock files filtered by navigation
  const fileItems: FileItem[] = !isLoggedIn && activeTab !== "Community"
    ? []
    : isFallbackMode
      ? mockFileItems.filter((item) => {
          const itemDeleted = !!item.isDeleted;
          if (activeTab === "Trash") {
            return itemDeleted && item.type === "file";
          }
          if (itemDeleted) {
            return false;
          }

          if (currentFolderId !== null) {
            // Inside a folder, show files belonging to this folder (applicable to both My Files and Starred)
            return (
              item.type === "file" &&
              String(item.folderId) === String(currentFolderId)
            );
          }

          if (activeTab === "My Files") {
            // At root, show folders and root files
            return item.type.startsWith("folder") || !item.folderId;
          } else if (activeTab === "Starred") {
            return !!item.isStarred;
          } else if (activeTab === "Community") {
            return !!item.isPublic && item.type === "file";
          } else if (activeTab === "Shared") {
            return item.type === "file" && item.owner !== "Me";
          } else if (activeTab === "Friends") {
            return false;
          }
          return true;
        })
      : [
          ...apiFolders.map((folder) => ({
            id: String(folder.folderId),
            name: folder.name,
            type: "folder" as const,
            owner: resolveOwnerEmail(folder.userId),
            lastModified: new Date(folder.createdAt).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              },
            ),
            size: "--",
            isStarred: folder.isStarred,
          })),
          ...apiFiles.map(mapApiFileToFileItem),
        ];

  // Calculate dynamic storage usage metrics
  const usedBytes = isLoggedIn ? allMyFilesSize + allSharedFilesSize : 0;

  const totalBytes = (isLoggedIn ? storageLimitGb : 2) * 1024 * 1024 * 1024;

  const usedPercentage = Math.min(
    100,
    Math.round((usedBytes / totalBytes) * 100),
  );
  const dynamicStorage = {
    usedBytes,
    totalBytes,
    usedPercentage,
    formattedUsed: formatBytes(usedBytes),
    formattedTotal: `${isLoggedIn ? storageLimitGb : 2} GB`,
  };

  // When document filters are active, they replace the tab-based file list with
  // the caller's own filtered documents (the backend filter endpoint is scoped to
  // "my documents", so folders and other tabs' content don't apply here).
  const filterResultItems: FileItem[] = filteredItems.map(mapApiFileToFileItem);

  // Search filtering
  const filteredFiles = (
    isFilterModeActive ? filterResultItems : fileItems
  ).filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const exitFilterMode = () => {
    setIsFilterModeActive(false);
    setFilteredItems([]);
    setFilterPageMeta(null);
  };

  const handleResetFilters = () => {
    setFilterTagIds([]);
    setFilterContentType("");
    setFilterCreatedFrom("");
    setFilterCreatedTo("");
    setFilterSort("NEWEST");
    setFilterPage(0);
    exitFilterMode();
  };

  const applyFilterChange = () => {
    setFilterPage(0);
    setIsFilterModeActive(true);
  };

  const handleFilterTagsChange = (ids: number[]) => {
    setFilterTagIds(ids);
    applyFilterChange();
  };
  const handleFilterContentTypeChange = (value: string) => {
    setFilterContentType(value);
    applyFilterChange();
  };
  const handleFilterCreatedFromChange = (value: string) => {
    setFilterCreatedFrom(value);
    applyFilterChange();
  };
  const handleFilterCreatedToChange = (value: string) => {
    setFilterCreatedTo(value);
    applyFilterChange();
  };
  const handleFilterSortChange = (value: DocumentFilterSort) => {
    setFilterSort(value);
    applyFilterChange();
  };

  // Multi-selection handlers
  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedItemIds.size === filteredFiles.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleBulkMove = () => {
    if (selectedItemIds.size === 0) return;
    setIsMoveToOpen(true);
  };

  const handleBulkDeleteOrRemove = async () => {
    if (selectedItemIds.size === 0) return;
    const selectedArray = Array.from(selectedItemIds);
    const numericIds = selectedArray.map(Number).filter((n) => !isNaN(n));

    if (activeTab === "Shared") {
      const confirmRemove = await confirmAction({
        title: "Remove selected shared documents?",
        message: `Are you sure you want to permanently remove access to these ${numericIds.length} selected shared documents? You will not be able to access them unless re-shared.`,
        confirmLabel: "Remove Access",
      });
      if (!confirmRemove) return;

      setIsLoadingFiles(true);
      const response = await documentService.bulkRemoveSharedWithMeDocuments(numericIds);
      if (response.data && response.data.success) {
        alert("Removed selected shared documents successfully!");
        setSelectedItemIds(new Set());
        fetchFiles();
      } else {
        alert(`Failed to remove shared documents: ${response.error || "Server error"}`);
        setIsLoadingFiles(false);
      }
    } else {
      const confirmDelete = await confirmAction({
        title: "Move selected documents to Trash?",
        message: `Are you sure you want to move ${numericIds.length} selected items to Trash?`,
        confirmLabel: "Move to Trash",
      });
      if (!confirmDelete) return;

      setIsLoadingFiles(true);
      const response = await documentService.bulkTrashDocuments(numericIds);
      if (response.data && response.data.success) {
        alert("Moved selected documents to trash successfully!");
        setSelectedItemIds(new Set());
        fetchFiles();
      } else {
        alert(`Failed to delete documents: ${response.error || "Server error"}`);
        setIsLoadingFiles(false);
      }
    }
  };

  // Trigger S3 File Upload Modal
  const handleTabChange = (tabName: string) => {
    if ((tabName === "AI Assistant" || tabName === "Admin") && !isAdmin) {
      setActiveTab("My Files");
      sessionStorage.setItem("dashboardActiveTab", "My Files");
      return;
    }
    setCurrentFolderId(null);
    setCurrentFolderName(null);
    setActiveTab(tabName);
    setIsFolderChatOpen(false);
    setSelectedItemIds(new Set());
    exitFilterMode();
  };

  const handleUploadFile = () => {
    if (!isLoggedIn) {
      // Upload yêu cầu authentication; user chưa đăng nhập được redirect trước khi mở modal.
      alert("Please log in to upload files.");
      navigate("/login");
      return;
    }
    // Truyền folder hiện tại vào modal để upload thành công có thể được đặt đúng folder.
    setIsUploadModalOpen(true);
  };

  const handleNewFolder = () => {
    if (!isLoggedIn) {
      alert("Please log in to create folders.");
      navigate("/login");
      return;
    }
    setIsCreateFolderOpen(true);
  };

  const handleItemClick = (item: FileItem) => {
    if (!isLoggedIn && activeTab !== "Community") {
      alert("Please log in to view file details.");
      navigate("/login");
      return;
    }
    if (item.type === "folder" || item.type === "folder_shared") {
      setCurrentFolderId(Number(item.id));
      setCurrentFolderName(item.name);
      setIsFolderChatOpen(false);
    } else {
      const numericDocId = Number(item.id);
      if (!isNaN(numericDocId) && (activeTab === "Shared" || item.isUnread)) {
        const currentUserId = Number(localStorage.getItem("userId")) || null;
        markSharedDocAsRead(numericDocId, currentUserId);
        setApiFiles((prev) =>
          prev.map((f) =>
            f.documentId === numericDocId ? { ...f, isUnread: false } : f
          )
        );
      }
      navigate(`/document/${item.id}`, {
        state: {
          fromTab: activeTab,
          fromFolderId: currentFolderId,
          fromFolderName: currentFolderName,
        },
      });
    }
  };

  const handleConfirmFolderDelete = async () => {
    if (!folderDeleteTarget) return;

    setIsDeletingFolder(true);
    try {
      if (!isFallbackMode) {
        const numericFolderId = Number(folderDeleteTarget.id);
        if (isNaN(numericFolderId)) {
          alert("Invalid folder ID.");
          return;
        }

        setIsLoadingFiles(true);
        const response = await folderService.deleteFolder(numericFolderId);
        if (response.data && response.data.success) {
          if (currentFolderId === numericFolderId) {
            setCurrentFolderId(null);
            setCurrentFolderName(null);
            setIsFolderChatOpen(false);
          }
          alert("Folder moved to Trash successfully!");
          fetchFiles();
        } else {
          alert(`Failed to delete folder: ${response.error || "Server error"}`);
          setIsLoadingFiles(false);
        }
      } else {
        mockFileItems.forEach((mockItem) => {
          if (String(mockItem.folderId) === String(folderDeleteTarget.id)) {
            mockItem.isDeleted = true;
          }
        });
        const folderIndex = mockFileItems.findIndex(
          (mockItem) => mockItem.id === folderDeleteTarget.id,
        );
        if (folderIndex !== -1) mockFileItems[folderIndex].isDeleted = true;

        if (String(currentFolderId) === String(folderDeleteTarget.id)) {
          setCurrentFolderId(null);
          setCurrentFolderName(null);
          setIsFolderChatOpen(false);
        }
        alert("Folder moved to Trash successfully!");
        fetchFiles();
      }
    } finally {
      setIsDeletingFolder(false);
      setFolderDeleteTarget(null);
    }
  };

  const handleItemActionClick = async (item: FileItem, action: string) => {
    if (action === "open") {
      handleItemClick(item);
      return;
    }

    if (!isLoggedIn) {
      alert("Please log in to perform this action.");
      navigate("/login");
      return;
    }
    if (action === "delete") {
      if (item.type === "folder" || item.type === "folder_shared") {
        if (item.type === "folder_shared") {
          alert("Shared folders cannot be deleted.");
          return;
        }
        setFolderDeleteTarget(item);
        return;
      }
      const confirmDelete = await confirmAction({ title: "Move document to Trash?", message: `Move "${item.name}" to Trash?`, confirmLabel: "Move to Trash" });
      if (!confirmDelete) return;

      const numericId = Number(item.id);
      if (!isNaN(numericId) && !isFallbackMode) {
        setIsLoadingFiles(true);
        const response = await documentService.deleteDocument(numericId);
        if (response.data && response.data.success) {
          alert("Document moved to trash successfully!");
          fetchFiles();
        } else {
          alert(
            `Failed to delete document: ${response.error || "Server error"}`,
          );
          setIsLoadingFiles(false);
        }
      } else {
        const mockItem = mockFileItems.find((f) => f.id === item.id);
        if (mockItem) mockItem.isDeleted = true;
        alert(`Mock soft-deleted: ${item.name}`);
        fetchFiles();
      }
    } else if (action === "restore") {
      const numericId = Number(item.id);
      if (!isNaN(numericId) && !isFallbackMode) {
        setIsLoadingFiles(true);
        const response =
          item.type === "folder" || item.type === "folder_shared"
            ? await folderService.restoreFolder(numericId)
            : await documentService.restoreDocument(numericId);
        if (response.data && response.data.success) {
          alert(`${item.type === "folder" ? "Folder" : "Document"} restored successfully!`);
          fetchFiles();
        } else {
          alert(
            `Failed to restore: ${response.error || "Server error"}`,
          );
          setIsLoadingFiles(false);
        }
      } else {
        const mockItem = mockFileItems.find((f) => f.id === item.id);
        if (mockItem) mockItem.isDeleted = false;
        alert(`Mock restored: ${item.name}`);
        fetchFiles();
      }
    } else if (action === "delete_permanent") {
      const confirmDelete = await confirmAction({ title: "Delete permanently?", message: `Permanently delete "${item.name}"? This action cannot be undone.`, confirmLabel: "Delete" });
      if (!confirmDelete) return;

      const numericId = Number(item.id);
      if (!isNaN(numericId) && !isFallbackMode) {
        setIsLoadingFiles(true);
        const response =
          item.type === "folder" || item.type === "folder_shared"
            ? await folderService.permanentlyDeleteFolder(numericId)
            : await documentService.deleteDocumentPermanently(numericId);
        if (response.data && response.data.success) {
          alert(`${item.type === "folder" ? "Folder" : "Document"} permanently deleted!`);
          fetchFiles();
        } else {
          alert(
            `Failed to delete permanently: ${response.error || "Server error"}`,
          );
          setIsLoadingFiles(false);
        }
      } else {
        const idx = mockFileItems.findIndex((f) => f.id === item.id);
        if (idx !== -1) mockFileItems.splice(idx, 1);
        alert(`Mock permanently deleted: ${item.name}`);
        fetchFiles();
      }
    } else if (action === "rename") {
      setRenameTarget({
        id: item.id,
        name: item.name,
        type:
          item.type === "folder" || item.type === "folder_shared"
            ? "folder"
            : "file",
      });
      setIsRenameOpen(true);
    } else if (action === "move_to") {
      setMoveTarget(item);
      setIsMoveToOpen(true);
    } else if (action === "move_out") {
      const numericId = Number(item.id);
      if (!isNaN(numericId) && !isFallbackMode) {
        setIsLoadingFiles(true);
        const response = await documentService.moveDocumentToFolder(
          numericId,
          null,
        );
        if (response.data && response.data.success) {
          alert(`Moved "${item.name}" out of folder successfully.`);
          fetchFiles();
        } else {
          alert(`Failed to move file: ${response.error || "Server error"}`);
          setIsLoadingFiles(false);
        }
      } else {
        const mockItem = mockFileItems.find((f) => f.id === item.id);
        if (mockItem) mockItem.folderId = null;
        alert(`Mock moved "${item.name}" out of folder.`);
        fetchFiles();
      }
    } else if (action === "toggle_star") {
      const numericId = Number(item.id);
      const newStar = !item.isStarred;
      if (!isNaN(numericId) && !isFallbackMode) {
        setIsLoadingFiles(true);
        let success: boolean;
        let error: string;
        if (item.type === "folder" || item.type === "folder_shared") {
          const response = await folderService.starFolder(numericId, newStar);
          success = !!(response.data && response.data.success);
          error = response.error || "";
        } else {
          const response = await documentService.starDocument(
            numericId,
            newStar,
          );
          success = !!(response.data && response.data.success);
          error = response.error || "";
        }

        if (success) {
          alert(`${newStar ? "Starred" : "Unstarred"} successfully!`);
          fetchFiles();
        } else {
          alert(`Failed to update starred status: ${error || "Server error"}`);
          setIsLoadingFiles(false);
        }
      } else {
        const mockItem = mockFileItems.find((f) => f.id === item.id);
        if (mockItem) mockItem.isStarred = newStar;
        alert(`Mock toggled star status for: ${item.name}`);
        fetchFiles();
      }
    } else if (action === "toggle_visibility") {
      const numericId = Number(item.id);
      if (!isNaN(numericId) && !isFallbackMode) {
        setIsLoadingFiles(true);
        const newVisibility = !item.isPublic;
        const response = await documentService.updateDocumentVisibility(
          numericId,
          newVisibility,
        );
        if (response.data && response.data.success) {
          alert(
            `Document visibility changed to ${newVisibility ? "Public" : "Private"} successfully!`,
          );
          fetchFiles();
        } else {
          alert(
            `Failed to update visibility: ${response.error || "Server error"}`,
          );
          setIsLoadingFiles(false);
        }
      } else {
        const mockItem = mockFileItems.find((f) => f.id === item.id);
        if (mockItem) mockItem.isPublic = !mockItem.isPublic;
        alert(`Mock toggled visibility for: ${item.name}`);
        fetchFiles();
      }
    } else if (action === "share") {
      const numericId = Number(item.id);
      if (!isNaN(numericId)) {
        setShareTarget({
          id: numericId,
          name: item.name,
          isPublic: !!item.isPublic,
        });
        setIsShareModalOpen(true);
      } else {
        alert("Sharing mock items is not supported.");
      }
    } else if (action === "remove_shared") {
      const confirmRemove = await confirmAction({
        title: "Remove shared document?",
        message: `Are you sure you want to permanently remove access to "${item.name}"? You will not be able to access it unless re-shared.`,
        confirmLabel: "Remove Access",
      });
      if (!confirmRemove) return;

      const numericId = Number(item.id);
      if (!isNaN(numericId) && !isFallbackMode) {
        setIsLoadingFiles(true);
        const response = await documentService.removeSharedWithMeDocument(numericId);
        if (response.data && response.data.success) {
          alert(`Removed "${item.name}" from shared documents.`);
          fetchFiles();
        } else {
          alert(`Failed to remove shared document: ${response.error || "Server error"}`);
          setIsLoadingFiles(false);
        }
      }
    } else if (action === "save_to_my_files") {
      setSaveTarget(item);
      setIsSaveToOpen(true);
    }
  };

  // Submit handlers for Modals
  const handleCreateFolderSubmit = async (name: string) => {
    if (!isFallbackMode) {
      setIsLoadingFiles(true);
      const response = await folderService.createFolder(name);
      if (response.data && response.data.success) {
        alert("Folder created successfully!");
        loadAllFolders();
        fetchFiles();
      } else {
        alert(`Failed to create folder: ${response.error || "Server error"}`);
        setIsLoadingFiles(false);
      }
    } else {
      mockFileItems.push({
        id: "f_mock_" + (mockFileItems.length + 1),
        name: name,
        type: "folder",
        owner: "Me",
        lastModified: "Just now",
        size: "--",
      });
      alert(`Mock created folder: ${name}`);
      fetchFiles();
    }
  };

  const handleRenameSubmit = async (newName: string) => {
    if (!renameTarget) return;

    if (!isFallbackMode) {
      setIsLoadingFiles(true);
      let success: boolean;
      let error: string;
      if (renameTarget.type === "file") {
        const response = await documentService.renameDocument(
          Number(renameTarget.id),
          newName,
        );
        success = !!(response.data && response.data.success);
        error = response.error || "";
      } else {
        const response = await folderService.updateFolder(
          Number(renameTarget.id),
          newName,
        );
        success = !!(response.data && response.data.success);
        error = response.error || "";
      }

      if (success) {
        alert("Renamed successfully!");
        loadAllFolders();
        fetchFiles();
      } else {
        alert(`Failed to rename: ${error || "Server error"}`);
        setIsLoadingFiles(false);
      }
    } else {
      const mockItem = mockFileItems.find((f) => f.id === renameTarget.id);
      if (mockItem) {
        mockItem.name = newName;
      }
      alert(`Mock renamed to: ${newName}`);
      fetchFiles();
    }
  };

  const handleMoveToSubmit = async (targetFolderId: number | string | null) => {
    const numericFolderId = targetFolderId === null ? null : Number(targetFolderId);

    if (selectedItemIds.size > 0) {
      const numericIds = Array.from(selectedItemIds).map(Number).filter((n) => !isNaN(n));
      setIsLoadingFiles(true);
      const response = await documentService.bulkMoveDocuments(numericIds, numericFolderId);
      if (response.data && response.data.success) {
        alert("Bulk moved documents successfully!");
        setSelectedItemIds(new Set());
        fetchFiles();
      } else {
        alert(`Failed to move documents: ${response.error || "Server error"}`);
        setIsLoadingFiles(false);
      }
      return;
    }

    if (!moveTarget) return;

    if (!isFallbackMode) {
      setIsLoadingFiles(true);
      const numericFolderId =
        targetFolderId === null ? null : Number(targetFolderId);
      const response = await documentService.moveDocumentToFolder(
        Number(moveTarget.id),
        numericFolderId,
      );
      if (response.data && response.data.success) {
        alert("Document moved successfully!");
        fetchFiles();
      } else {
        alert(`Failed to move document: ${response.error || "Server error"}`);
        setIsLoadingFiles(false);
      }
    } else {
      const mockItem = mockFileItems.find((f) => f.id === moveTarget.id);
      if (mockItem) {
        mockItem.folderId = targetFolderId ? String(targetFolderId) : null;
      }
      alert(`Mock moved document to folder ID: ${targetFolderId || "Root"}`);
      fetchFiles();
    }
  };

  const handleBulkSaveCommunityToMyFiles = () => {
    if (!isLoggedIn) {
      alert("Please log in to save Community documents to My Files.");
      navigate("/login");
      return;
    }
    setSaveTarget({
      id: "-1",
      name: `${selectedItemIds.size} selected public documents`,
      type: "file",
      size: "--",
      lastModified: "Today",
      owner: "Community",
    });
    setIsSaveToOpen(true);
  };

  const handleBulkSaveSharedToMyFiles = () => {
    setSaveTarget({
      id: "-1",
      name: `${selectedItemIds.size} selected shared documents`,
      type: "file",
      size: "--",
      lastModified: "Today",
      owner: "Shared",
    });
    setIsSaveToOpen(true);
  };

  const handleSaveToFolderSubmit = async (targetFolderId: number | string | null) => {
    const numericFolderId = targetFolderId !== null ? Number(targetFolderId) : null;

    if (selectedItemIds.size > 0 && (activeTab === "Community" || activeTab === "Shared")) {
      const numericIds = Array.from(selectedItemIds).map(Number).filter((n) => !isNaN(n));
      setIsLoadingFiles(true);
      const response = activeTab === "Shared"
        ? await documentService.bulkSaveSharedWithMeDocumentsToMyFiles(numericIds, numericFolderId)
        : await documentService.bulkSavePublicDocumentsToMyFiles(numericIds, numericFolderId);

      if (response.data && response.data.success) {
        alert(`Successfully saved ${numericIds.length} documents to My Files!`);
        setSelectedItemIds(new Set());
        fetchFiles();
      } else {
        alert(`Failed to save documents: ${response.error || "Server error"}`);
        setIsLoadingFiles(false);
      }
      return;
    }

    if (!saveTarget) return;
    const numericDocId = Number(saveTarget.id);

    if (!isNaN(numericDocId) && !isFallbackMode) {
      setIsLoadingFiles(true);
      const response = activeTab === "Shared"
        ? await documentService.saveSharedWithMeDocumentToMyFiles(numericDocId, numericFolderId)
        : await documentService.savePublicDocumentToMyFiles(numericDocId, numericFolderId);

      if (response.data && response.data.success) {
        alert(`Successfully saved "${saveTarget.name}" to My Files!`);
        fetchFiles();
      } else {
        alert(`Failed to save document: ${response.error || "Server error"}`);
        setIsLoadingFiles(false);
      }
    } else {
      alert(`Saved "${saveTarget.name}" to My Files!`);
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onSearch={setSearchQuery}
      onUploadClick={handleUploadFile}
      onNewFolderClick={handleNewFolder}
      storage={dynamicStorage}
    >
      {activeTab === "Friends" ? (
        <FriendsView />
      ) : activeTab === "Settings" ? (
        <SettingsView />
      ) : activeTab === "AI Assistant" && isAdmin ? (
        <AiAssistantConfigView />
      ) : activeTab === "Smart Chat" ? (
        <SmartChatView />
      ) : activeTab === "Admin" && isAdmin ? (
        <AdminPlansView />
      ) : (
        /* Main File List / Grid Section */
        <section className="rounded-[22px] border border-outline-variant/70 bg-surface p-4 md:p-6 shadow-[0_18px_60px_rgba(35,48,38,0.06)] space-y-5">
          {/* Section Header with View Toggles */}
          <div className="flex items-end justify-between gap-4 border-b border-outline-variant/60 pb-5">
            <div className="select-none min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-secondary font-semibold mb-1">Documents</p>
              <div className="text-[26px] leading-8 font-bold tracking-[-0.035em] text-on-surface">
              {searchQuery ? (
                `Search Results for "${searchQuery}"`
              ) : isFilterModeActive ? (
                "Filtered results"
              ) : (
                <div className="flex items-center gap-1.5">
                  {currentFolderName && (
                    <button
                      onClick={() => {
                        setCurrentFolderId(null);
                        setCurrentFolderName(null);
                        setIsFolderChatOpen(false);
                      }}
                      className="p-1 rounded-full text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer mr-1"
                      title="Back to root"
                    >
                      <span className="material-symbols-outlined text-[24px] select-none">
                        arrow_back
                      </span>
                    </button>
                  )}
                  <span
                    onClick={() => {
                      setCurrentFolderId(null);
                      setCurrentFolderName(null);
                    }}
                    className="cursor-pointer hover:text-primary transition-colors font-bold text-on-surface"
                  >
                    {activeTab}
                  </span>
                  {currentFolderName && (
                    <>
                      <span className="text-secondary select-none font-normal">
                        /
                      </span>
                      <span
                        className="text-secondary truncate max-w-[200px]"
                        title={currentFolderName}
                      >
                        {currentFolderName}
                      </span>
                    </>
                  )}
                </div>
              )}
              </div>
              <p className="mt-1 text-xs text-secondary">{filteredFiles.length} items · organized in your workspace</p>
            </div>
            <div className="flex items-center gap-2 select-none">
              {currentFolderId !== null && (
                <button
                  onClick={() => setIsFolderChatOpen(!isFolderChatOpen)}
                  className={`p-2.5 rounded-lg transition-colors border cursor-pointer flex items-center gap-1.5 ${
                    isFolderChatOpen
                      ? "text-tertiary bg-tertiary-fixed/30 border-tertiary/20"
                      : "text-secondary hover:bg-surface-container-high border-transparent hover:border-outline-variant"
                  }`}
                  title="Chat with Folder"
                >
                  <span className="material-symbols-outlined text-[20px] select-none">
                    smart_toy
                  </span>
                  <span className="text-label-md font-bold hidden sm:inline select-none">
                    Folder Chat
                  </span>
                </button>
              )}

              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors border cursor-pointer ${
                  viewMode === "grid"
                    ? "text-primary bg-primary-fixed/30 border-primary/20"
                    : "text-secondary hover:bg-surface-container-high border-transparent hover:border-outline-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  grid_view
                </span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors border cursor-pointer ${
                  viewMode === "list"
                    ? "text-primary bg-primary-fixed/30 border-primary/20"
                    : "text-secondary hover:bg-surface-container-high border-transparent hover:border-outline-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  view_list
                </span>
              </button>

              <div ref={filterPanelRef} className="relative">
                <button
                  onClick={() => setIsFilterPanelOpen((open) => !open)}
                  className={`p-2 rounded-lg transition-colors border cursor-pointer ml-2 ${
                    isFilterModeActive
                      ? "text-primary bg-primary-fixed/30 border-primary/20"
                      : "text-secondary hover:bg-surface-container-high border-transparent hover:border-outline-variant"
                  }`}
                  title="Filter documents"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    filter_list
                  </span>
                </button>

                {isFilterPanelOpen && (
                  <FilterPanel
                    availableTags={availableTags}
                    selectedTagIds={filterTagIds}
                    onTagsChange={handleFilterTagsChange}
                    contentType={filterContentType}
                    onContentTypeChange={handleFilterContentTypeChange}
                    createdFrom={filterCreatedFrom}
                    onCreatedFromChange={handleFilterCreatedFromChange}
                    createdTo={filterCreatedTo}
                    onCreatedToChange={handleFilterCreatedToChange}
                    sort={filterSort}
                    onSortChange={handleFilterSortChange}
                    onReset={handleResetFilters}
                    hasActiveFilters={hasActiveFilters}
                  />
                )}
              </div>
            </div>
          </div>

          {activeTab === "Shared" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-outline-variant/60 bg-surface-container-low p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  {sharedView === "with-me" ? "Documents shared with you" : "Documents you shared"}
                </p>
                <p className="text-xs text-secondary mt-0.5">
                  {sharedView === "with-me"
                    ? "Files another person gave you access to. The Shared by column shows the owner."
                    : "Your files with direct recipients. Open the Share action to review or change access."}
                </p>
              </div>
              <div className="inline-flex shrink-0 rounded-lg border border-outline-variant bg-surface p-1" aria-label="Shared document view">
                <button type="button" onClick={() => { setSharedView("with-me"); setSelectedItemIds(new Set()); }} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${sharedView === "with-me" ? "bg-primary text-on-primary" : "text-secondary hover:bg-surface-container"}`}>
                  Shared with me
                </button>
                <button type="button" onClick={() => { setSharedView("by-me"); setSelectedItemIds(new Set()); }} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${sharedView === "by-me" ? "bg-primary text-on-primary" : "text-secondary hover:bg-surface-container"}`}>
                  Shared by me
                </button>
              </div>
            </div>
          )}

          {activeTab === "Community" && (
            <div className="flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-3">
              <span className="material-symbols-outlined text-primary text-[20px]">public</span>
              <div>
                <p className="text-sm font-semibold text-on-surface">Public community library</p>
                <p className="text-xs text-secondary mt-0.5">Discover documents their owners made public. You can preview them or save a private copy to My Files.</p>
              </div>
            </div>
          )}

          {/* Bulk Action Bar */}
          {selectedItemIds.size > 0 && (() => {
            const hasSelectedFolder = filteredFiles.some(
              (f) => selectedItemIds.has(f.id) && (f.type === "folder" || f.type === "folder_shared")
            );

            return (
              <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl px-4 py-2.5 mb-4 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">check_box</span>
                  <span className="font-title-sm text-on-surface font-semibold">
                    {selectedItemIds.size} {selectedItemIds.size === 1 ? "item" : "items"} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {activeTab === "Community" ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleBulkSaveCommunityToMyFiles}
                      className="flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">folder_open</span>
                      Save Selected to My Files
                    </Button>
                  ) : activeTab === "Shared" && sharedView === "with-me" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkSaveSharedToMyFiles}
                        className="flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">folder_open</span>
                        Save Selected to My Files
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleBulkDeleteOrRemove}
                        className="flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">person_remove</span>
                        Remove from Shared
                      </Button>
                    </>
                  ) : (
                    <>
                      {activeTab !== "Trash" && !hasSelectedFolder && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBulkMove}
                          className="flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[18px]">drive_file_move</span>
                          Move Selected
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleBulkDeleteOrRemove}
                        className="flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Delete Selected
                      </Button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedItemIds(new Set())}
                    className="p-1 text-secondary hover:text-on-surface rounded-full hover:bg-surface-container-high ml-2 cursor-pointer"
                    title="Deselect All"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Dynamic Layout switching */}
          <div className="flex gap-4 items-start">
            <div className="flex-1 min-w-0">
              {viewMode === "list" ? (
                <FileList
                  items={filteredFiles}
                  isLoading={
                    isFilterModeActive ? isFilterLoading : isLoadingFiles
                  }
                  onItemClick={handleItemClick}
                  onItemActionClick={handleItemActionClick}
                  selectedItemIds={selectedItemIds}
                  onToggleSelectItem={handleToggleSelectItem}
                  onToggleSelectAll={handleToggleSelectAll}
                  isTrash={activeTab === "Trash"}
                  isCommunity={activeTab === "Community"}
                  isShared={activeTab === "Shared"}
                  isSharedByMe={activeTab === "Shared" && sharedView === "by-me"}
                  emptyTitle={
                    isFilterModeActive
                      ? "No documents match your filters"
                      : activeTab === "Shared" && sharedView === "with-me"
                        ? "No documents shared with you"
                        : activeTab === "Shared"
                          ? "You have not shared any documents"
                          : activeTab === "Community"
                            ? "No public documents yet"
                            : undefined
                  }
                  emptyDescription={
                    isFilterModeActive
                      ? "Try adjusting or resetting your filters."
                      : activeTab === "Shared" && sharedView === "with-me"
                        ? "Documents shared directly with your account will appear here."
                        : activeTab === "Shared"
                          ? "Share a document from My Files to see its recipients here."
                          : activeTab === "Community"
                            ? "Public documents from the community will appear here."
                            : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredFiles.map((file) => {
                    const iconInfo = getFileIconDetails(file.name, file.type);
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleItemClick(file)}
                        className="group bg-surface-container-low/45 rounded-2xl border border-outline-variant/70 p-4 hover:bg-primary-fixed/20 hover:border-primary/20 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(35,48,38,0.08)] transition-all duration-200 cursor-pointer flex flex-col justify-between h-36 relative"
                      >
                        <div className="flex justify-between items-start">
                          <span
                            className={`material-symbols-outlined text-display-lg icon-fill select-none ${iconInfo.classes}`}
                          >
                            {iconInfo.name}
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Visibility indicator in Grid View */}
                            {file.type === "file" && (
                              <span
                                className="text-secondary material-symbols-outlined text-[16px] select-none mr-1"
                                title={
                                  file.isPublic
                                    ? "Public Document"
                                    : "Private Document"
                                }
                              >
                                {file.isPublic ? "public" : "lock"}
                              </span>
                            )}

                            {activeTab === "Trash" ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleItemActionClick(file, "restore");
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-secondary hover:text-primary rounded transition-opacity cursor-pointer select-none"
                                  title="Restore"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    restore
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleItemActionClick(
                                      file,
                                      "delete_permanent",
                                    );
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-secondary hover:text-error rounded transition-opacity cursor-pointer select-none"
                                  title="Delete Permanently"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    delete_forever
                                  </span>
                                </button>
                              </>
                            ) : activeTab === "Community" ? null : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleItemActionClick(file, "delete");
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-secondary hover:text-error rounded transition-opacity cursor-pointer select-none"
                                title="Delete"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  delete
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-label-md text-label-md text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                            {file.name}
                          </h4>
                          <p className="font-mono-label text-[10px] text-secondary mt-1">
                            {file.size === "--" ? "Folder" : file.size} •{" "}
                            {file.lastModified}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {isFilterModeActive &&
                filterPageMeta &&
                filterPageMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 select-none">
                    <span className="font-body-md text-secondary text-sm">
                      Page {filterPageMeta.page + 1} of{" "}
                      {filterPageMeta.totalPages} (
                      {filterPageMeta.totalElements} documents)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={filterPage === 0}
                        onClick={() => setFilterPage((p) => Math.max(0, p - 1))}
                        className="px-3 py-1.5 rounded-lg border border-outline-variant text-secondary hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={filterPage + 1 >= filterPageMeta.totalPages}
                        onClick={() => setFilterPage((p) => p + 1)}
                        className="px-3 py-1.5 rounded-lg border border-outline-variant text-secondary hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
            </div>

            {isFolderChatOpen && currentFolderId !== null && (
              <div className="fixed inset-x-3 bottom-3 top-[76px] z-40 overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-2xl md:left-auto md:right-4 md:w-[460px] lg:static lg:z-auto lg:h-[calc(100vh-180px)] lg:min-h-[450px] lg:w-[430px] lg:shrink-0 lg:shadow-lg animate-in slide-in-from-right duration-250">
                <DocumentChat
                  isFolderMode={true}
                  folderId={currentFolderId}
                  folderName={currentFolderName || "Folder"}
                  documentIds={apiFiles
                    .filter((f) => f.status === "READY")
                    .map((f) => f.documentId)}
                  documents={apiFiles.map((f) => ({
                    documentId: f.documentId,
                    originalFileName: f.originalFileName,
                  }))}
                  onClose={() => setIsFolderChatOpen(false)}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Refresh state dashboard sau khi modal upload, gắn tag và đưa file vào folder hoàn tất. */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={fetchFiles}
        folderId={currentFolderId}
      />

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreate={handleCreateFolderSubmit}
      />

      <ConfirmModal
        isOpen={folderDeleteTarget !== null}
        title="Move folder to Trash?"
        message={`Move "${folderDeleteTarget?.name || "this folder"}" to Trash? Documents in this folder will also be moved to Trash.`}
        confirmLabel="Move to Trash"
        isConfirming={isDeletingFolder}
        onCancel={() => setFolderDeleteTarget(null)}
        onConfirm={handleConfirmFolderDelete}
      />

      <RenameModal
        isOpen={isRenameOpen}
        onClose={() => {
          setIsRenameOpen(false);
          setRenameTarget(null);
        }}
        currentName={renameTarget?.name || ""}
        itemType={renameTarget?.type || "file"}
        onRename={handleRenameSubmit}
      />

      <MoveToFolderModal
        isOpen={isMoveToOpen}
        onClose={() => {
          setIsMoveToOpen(false);
          setMoveTarget(null);
        }}
        folders={allFolders.map((f) => ({
          folderId: f.folderId,
          name: f.name,
        }))}
        currentFolderId={moveTarget?.folderId}
        onMove={handleMoveToSubmit}
      />

      <SaveToFolderModal
        isOpen={isSaveToOpen}
        onClose={() => {
          setIsSaveToOpen(false);
          setSaveTarget(null);
        }}
        documentName={saveTarget?.name || ""}
        folders={allFolders.map((f) => ({
          folderId: f.folderId,
          name: f.name,
        }))}
        onSave={handleSaveToFolderSubmit}
      />

      {shareTarget && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setShareTarget(null);
            fetchFiles();
          }}
          documentId={shareTarget.id}
          documentName={shareTarget.name}
          isInitiallyPublic={shareTarget.isPublic}
          onVisibilityChange={(isPublic) => {
            setShareTarget((prev) => (prev ? { ...prev, isPublic } : null));
          }}
        />
      )}
    </DashboardLayout>
  );
};
export default DashboardPage;
