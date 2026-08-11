export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'folder_shared' | 'file';
  fileType?: string; // 'presentation' | 'image' | 'document' etc.
  icon?: string;
  tags?: string[];
  owner: string;
  lastModified: string;
  size: string;
  isStarred?: boolean;
  isPublic?: boolean;
  isDeleted?: boolean;
  isUnread?: boolean;
  tagDetails?: { name: string; color: string }[];
  folderId?: number | string | null;
}

export interface SuggestedItem {
  id: string;
  name: string;
  type: 'presentation' | 'document' | 'workspace';
  icon: string;
  previewUrl?: string;
  tags?: string[];
  statusText: string;
  description?: string;
  metadata?: string;
  avatars?: string[];
  tagDetails?: { name: string; color: string }[];
}

export interface StorageUsage {
  usedBytes: number;
  totalBytes: number;
  usedPercentage: number;
  formattedUsed: string;
  formattedTotal: string;
}

export const mockStorageUsage: StorageUsage = {
  usedBytes: 15 * 1024 * 1024 * 1024,
  totalBytes: 100 * 1024 * 1024 * 1024,
  usedPercentage: 15,
  formattedUsed: '15GB',
  formattedTotal: '100GB',
};

export const mockSuggestedItems: SuggestedItem[] = [
  {
    id: 's1',
    name: 'Q3 Performance Review.key',
    type: 'presentation',
    icon: 'analytics',
    previewUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwF_-v-5qMiRQINgvhyYgtt7DsDjhfoHwgIxKuYAPJe2SW1yjWEPZq_pVWGIr4Vk8hJSGITpnj_N1Cc08xj10xiPQfYU3wA1S6fTEY_01wKrmAKYHL9nWeqq2fUUtHtHnalqarjMsjucy069qoGzVnE9L9TZuqdjFRTHeY3GdQtbW7qJSpPWb_nIQQgwaN18982CpclcSeTXcvINYCnqb6SWwZeC6WnFh1szVlyCDx9XHUoS-v2OL0_-it7N7fjjYXfC8ikZNBfzXz',
    tags: ['Marketing'],
    statusText: 'You edited just now',
    tagDetails: [{ name: 'Marketing', color: '#f59e0b' }],
  },
  {
    id: 's2',
    name: 'Project_Apollo_Brief.docx',
    type: 'document',
    icon: 'description',
    tags: ['Draft'],
    statusText: 'Shared by Sarah 2h ago',
    tagDetails: [{ name: 'Draft', color: '#64748b' }],
  },
  {
    id: 's3',
    name: 'Marketing Assets 2024',
    type: 'workspace',
    icon: 'folder_shared',
    description: 'Contains logos, branding guidelines, and campaign visuals.',
    statusText: 'Team Workspace',
    metadata: '24 items • 1.2 GB',
    avatars: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC6VOXji9olsF-FIsoozxgeEU6HgRqEumyGrwoDFoN0-uRQvlj0Qpnzpc1rBauSyJuYjUQLifOMn3p6Xrzu79umEsKp3nkA8HwZTddiV1b_uutWxFD0p-E_eMTc8EGO8ns3Bz39Q7NRPPC27BeeTZSnyjh-XTugmH7-FFrwGyvSBWeCjBOof57ZC9NVTgCEQ4Cuv01eAh4uVeUxvhJ3fJhVYnc-Nr75wps0bn7ZEa0ob94Xfo0L3-q8guvrZLuYstGy2c5l8xoyVZsW',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB5vNI6R5ZiLdfuipsy8M3FPSn42LaL4aASgt0mskVUSlusd4GtO9WvkFSeuixQokJ88AeoFN78eGEbUMo7GiIbJ7WbQZRreTVByl39vi-g73C6IrSXILngoQgE8gnLSxcL5PgEPxLQ3rFQwe-_owWZewB1bUexWJkIVtSJYqrdCkXVCIgg_3t5wsICCoPyR-qHTRV9CW61fIKm-9PIVeA7hEEAX3LfFma7gAxZh2iM42u5jxGFBAHio-xfGxb1H_ZZE7RX7ofBgtJ3',
    ],
  },
];

export const mockFileItems: FileItem[] = [
  {
    id: 'f1',
    name: 'Design System Resources',
    type: 'folder',
    tags: ['Design', 'UI/UX', '+1'],
    owner: 'Me',
    lastModified: 'Oct 24, 2023',
    size: '--',
    tagDetails: [
      { name: 'Design', color: '#6366f1' },
      { name: 'UI/UX', color: '#d946ef' },
    ],
  },
  {
    id: 'f2',
    name: 'Hero_Banner_v2.png',
    type: 'file',
    fileType: 'image',
    icon: 'image',
    tags: ['Urgent', 'Graphics', '+2'],
    owner: 'Me',
    lastModified: 'Yesterday',
    size: '4.2 MB',
    tagDetails: [
      { name: 'Urgent', color: '#ef4444' },
      { name: 'Graphics', color: '#14b8a6' },
    ],
    folderId: 'f1',
  },
  {
    id: 'f3',
    name: 'Q4 Strategy Planning.pdf',
    type: 'file',
    fileType: 'document',
    icon: 'description',
    tags: ['Marketing'],
    owner: 'Sarah J.',
    lastModified: 'Oct 20, 2023',
    size: '124 KB',
    tagDetails: [{ name: 'Marketing', color: '#f59e0b' }],
    folderId: 'f1',
  },
  {
    id: 'f4',
    name: 'Client Proposals',
    type: 'folder_shared',
    owner: 'Marketing Team',
    lastModified: 'Oct 15, 2023',
    size: '--',
  },
];
