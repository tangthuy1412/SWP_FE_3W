export interface NavigationItem {
  name: string;
  icon: string;
  badge?: 'shared' | 'friends';
  adminOnly?: boolean;
}

export const navigationSections: { label: string; items: NavigationItem[] }[] = [
  {
    label: 'Library',
    items: [
      { name: 'My Files', icon: 'folder_open' },
      { name: 'Smart Chat', icon: 'forum' },
      { name: 'Shared', icon: 'group', badge: 'shared' },
      { name: 'Community', icon: 'public' },
      { name: 'Offline', icon: 'offline_pin' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { name: 'AI Assistant', icon: 'smart_toy', adminOnly: true },
      { name: 'Friends', icon: 'person_add', badge: 'friends' },
      { name: 'Starred', icon: 'star' },
      { name: 'Trash', icon: 'delete' },
      { name: 'Admin', icon: 'admin_panel_settings', adminOnly: true },
    ],
  },
];
