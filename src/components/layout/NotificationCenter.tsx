import React, { useEffect, useRef, useState } from 'react';
import { friendService } from '../../services/friendService';

type NotificationItem = {
  id: string;
  type: 'friend' | 'upload' | 'system';
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
};

const storageKey = (userId: string | null) => `aether-notifications:${userId || 'guest'}`;

const readStoredItems = (): NotificationItem[] => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(localStorage.getItem('userId'))) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const NotificationCenter: React.FC<{ onOpenFriends?: () => void }> = ({ onOpenFriends }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(readStoredItems);
  const rootRef = useRef<HTMLDivElement>(null);

  const persist = (next: NotificationItem[]) => {
    setItems(next);
    localStorage.setItem(storageKey(localStorage.getItem('userId')), JSON.stringify(next.slice(0, 30)));
  };

  useEffect(() => {
    const refreshRequests = async () => {
      if (!localStorage.getItem('token')) return;
      const response = await friendService.getIncomingRequests();
      if (!response.data?.success) return;
      const stored = readStoredItems();
      const readIds = new Set(stored.filter((item) => item.read).map((item) => item.id));
      const requestItems: NotificationItem[] = response.data.data
        .filter((request) => request.status === 'PENDING')
        .map((request) => ({
          id: `friend-${request.requestId}`,
          type: 'friend',
          title: 'New friend request',
          message: `${request.senderName || request.senderEmail} wants to connect with you.`,
          createdAt: request.createdAt,
          read: readIds.has(`friend-${request.requestId}`),
        }));
      const localItems = stored.filter((item) => item.type !== 'friend');
      persist([...requestItems, ...localItems].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
    };
    refreshRequests();
    const timer = window.setInterval(refreshRequests, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<NotificationItem>).detail;
      if (!detail?.id) return;
      const current = readStoredItems().filter((item) => item.id !== detail.id);
      persist([{ ...detail, read: false }, ...current]);
    };
    window.addEventListener('aether-notification', receive);
    return () => window.removeEventListener('aether-notification', receive);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const unread = items.filter((item) => !item.read).length;
  const markAllRead = () => persist(items.map((item) => ({ ...item, read: true })));

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative grid h-10 w-10 place-items-center rounded-lg text-secondary transition-colors hover:bg-surface hover:text-on-surface" title="Notifications" aria-label={`${unread} unread notifications`}>
        <span className="material-symbols-outlined">notifications</span>
        {unread > 0 && <span className="absolute right-0.5 top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-error px-1 text-[9px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-[68px] z-50 overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <div><p className="text-sm font-bold text-on-surface">Notifications</p><p className="text-[11px] text-secondary">Updates that need your attention</p></div>
            {unread > 0 && <button type="button" onClick={markAllRead} className="text-xs font-semibold text-primary">Mark all read</button>}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? <div className="p-8 text-center"><span className="material-symbols-outlined text-3xl text-secondary">notifications_off</span><p className="mt-2 text-sm font-semibold text-on-surface">You are all caught up</p><p className="mt-1 text-xs text-secondary">New friend requests and upload updates will appear here.</p></div> : items.map((item) => (
              <button key={item.id} type="button" onClick={() => { persist(items.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry)); if (item.type === 'friend') { setOpen(false); onOpenFriends?.(); } }} className={`flex w-full items-start gap-3 border-b border-outline-variant px-4 py-3 text-left last:border-0 hover:bg-surface-container-low ${item.read ? '' : 'bg-primary-fixed/15'}`}>
                <span className={`material-symbols-outlined mt-0.5 text-[20px] ${item.type === 'friend' ? 'text-primary' : 'text-success'}`}>{item.type === 'friend' ? 'person_add' : 'cloud_done'}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-on-surface">{item.title}</span><span className="mt-0.5 block text-xs leading-5 text-secondary">{item.message}</span><span className="mt-1 block text-[10px] text-secondary">{new Date(item.createdAt).toLocaleString()}</span></span>
                {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
