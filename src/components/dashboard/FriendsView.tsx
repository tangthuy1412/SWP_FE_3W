import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useConfirm } from '../../contexts/ConfirmContext';
import { friendService } from '../../services/friendService';
import type { FriendResponse, FriendRequestResponse } from '../../services/friendService';

export const FriendsView: React.FC = () => {
  const confirmAction = useConfirm();
  const [activeSubTab, setActiveSubTab] = useState<'friends' | 'incoming' | 'outgoing'>('friends');
  const [friends, setFriends] = useState<FriendResponse[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestResponse[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Send Friend Request states
  const [requestEmail, setRequestEmail] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Operation loading state tracker
  const [pendingActionIds, setPendingActionIds] = useState<number[]>([]);

  const fetchFriendshipData = async () => {
    setIsLoading(true);
    try {
      const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
        friendService.getFriends(),
        friendService.getIncomingRequests(),
        friendService.getOutgoingRequests(),
      ]);

      if (friendsRes.data && friendsRes.data.success) {
        setFriends(friendsRes.data.data);
      }
      if (incomingRes.data && incomingRes.data.success) {
        setIncomingRequests(incomingRes.data.data);
      }
      if (outgoingRes.data && outgoingRes.data.success) {
        setOutgoingRequests(outgoingRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load friendship data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchFriendshipData();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail.trim()) return;

    setIsSendingRequest(true);

    try {
      const response = await friendService.sendFriendRequest(requestEmail.trim());
      if (response.data && response.data.success) {
        toast.success(`Friend request sent to ${requestEmail} successfully!`);
        setRequestEmail('');
        // Refresh outgoing requests list
        const outgoingRes = await friendService.getOutgoingRequests();
        if (outgoingRes.data && outgoingRes.data.success) {
          setOutgoingRequests(outgoingRes.data.data);
        }
      } else {
        toast.error(response.error || 'Failed to send friend request.');
      }
    } catch {
      toast.error('An error occurred while sending the request.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleUnfriend = async (friendId: number, friendshipId: number, name: string) => {
    const confirmed = await confirmAction({ title: 'Unfriend?', message: `Are you sure you want to unfriend ${name}?`, confirmLabel: 'Unfriend' });
    if (!confirmed) return;

    setPendingActionIds((prev) => [...prev, friendshipId]);
    try {
      const response = await friendService.unfriend(friendId);
      if (response.data && response.data.success) {
        setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
      } else {
        alert(response.error || 'Failed to unfriend user.');
      }
    } catch {
      alert('An error occurred while processing your request.');
    } finally {
      setPendingActionIds((prev) => prev.filter((id) => id !== friendshipId));
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    setPendingActionIds((prev) => [...prev, requestId]);
    try {
      const response = await friendService.acceptFriendRequest(requestId);
      if (response.data && response.data.success) {
        // Refresh both friends list and incoming list
        const [friendsRes, incomingRes] = await Promise.all([
          friendService.getFriends(),
          friendService.getIncomingRequests(),
        ]);
        if (friendsRes.data && friendsRes.data.success) setFriends(friendsRes.data.data);
        if (incomingRes.data && incomingRes.data.success) setIncomingRequests(incomingRes.data.data);
      } else {
        alert(response.error || 'Failed to accept friend request.');
      }
    } catch {
      alert('An error occurred while processing your request.');
    } finally {
      setPendingActionIds((prev) => prev.filter((id) => id !== requestId));
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    setPendingActionIds((prev) => [...prev, requestId]);
    try {
      const response = await friendService.rejectFriendRequest(requestId);
      if (response.data && response.data.success) {
        setIncomingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      } else {
        alert(response.error || 'Failed to reject friend request.');
      }
    } catch {
      alert('An error occurred while processing your request.');
    } finally {
      setPendingActionIds((prev) => prev.filter((id) => id !== requestId));
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    setPendingActionIds((prev) => [...prev, requestId]);
    try {
      const response = await friendService.cancelFriendRequest(requestId);
      if (response.data && response.data.success) {
        setOutgoingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      } else {
        alert(response.error || 'Failed to cancel friend request.');
      }
    } catch {
      alert('An error occurred while processing your request.');
    } finally {
      setPendingActionIds((prev) => prev.filter((id) => id !== requestId));
    }
  };

  // Filtering based on search query
  const filteredFriends = friends.filter(
    (f) =>
      f.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIncoming = incomingRequests.filter(
    (r) =>
      r.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.senderEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOutgoing = outgoingRequests.filter(
    (r) =>
      r.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.receiverEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string, email: string) => {
    const text = name || email || 'F';
    return text.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-surface rounded-2xl border border-surface-variant p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] space-y-6">
      
      {/* Top section: Title & Add Friend Widget */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-variant">
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface select-none">
            Friends Hub
          </h2>
          <p className="text-secondary text-body-sm mt-1 select-none">
            Manage your friendship requests and share documents directly with them.
          </p>
        </div>

        {/* Add Friend Form */}
        <form onSubmit={handleSendRequest} className="flex-1 max-w-md w-full">
          <div className="flex flex-col gap-2">
            <div className="flex rounded-lg border border-surface-variant bg-surface focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary overflow-hidden transition-all h-10.5">
              <input
                type="email"
                placeholder="Enter friend's email address..."
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                disabled={isSendingRequest}
                className="flex-1 bg-transparent px-4 text-body-md focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={isSendingRequest || !requestEmail.trim()}
                className="bg-primary text-on-primary hover:bg-primary/90 px-5 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSendingRequest ? (
                  <svg className="animate-spin h-4 w-4 text-on-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                )}
                Invite
              </button>
            </div>
            
          </div>
        </form>
      </div>

      {/* Sub tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        {/* Navigation sub-tabs */}
        <div className="flex bg-surface-container rounded-xl p-1 w-fit">
          <button
            onClick={() => { setActiveSubTab('friends'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg font-bold text-label-md transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'friends'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            My Friends
            <span className="bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded-full text-[10px]">
              {friends.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveSubTab('incoming'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg font-bold text-label-md transition-all cursor-pointer flex items-center gap-2 relative ${
              activeSubTab === 'incoming'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Incoming
            {incomingRequests.length > 0 ? (
              <span className="bg-error text-on-error px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                {incomingRequests.length}
              </span>
            ) : (
              <span className="bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded-full text-[10px]">
                0
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveSubTab('outgoing'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg font-bold text-label-md transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'outgoing'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Outgoing
            {outgoingRequests.length > 0 ? (
              <span className="bg-error text-on-error px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                {outgoingRequests.length}
              </span>
            ) : (
              <span className="bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded-full text-[10px]">
                0
              </span>
            )}
          </button>
        </div>

        {/* Filter Input */}
        <div className="flex items-center rounded-lg border border-surface-variant bg-surface px-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary overflow-hidden transition-all h-9.5 w-full sm:max-w-[240px]">
          <span className="material-symbols-outlined text-secondary text-[18px]">search</span>
          <input
            type="text"
            placeholder="Filter by name/email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent px-2 text-body-md focus:outline-none placeholder:text-secondary/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="material-symbols-outlined text-secondary hover:text-on-surface text-[18px] cursor-pointer"
            >
              close
            </button>
          )}
        </div>
      </div>

      {/* Content list */}
      <div className="min-h-[250px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="animate-spin h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-secondary text-body-md select-none">Fetching list...</span>
          </div>
        ) : (
          <>
            {/* Active SubTab 1: MY FRIENDS */}
            {activeSubTab === 'friends' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFriends.length > 0 ? (
                  filteredFriends.map((friend) => (
                    <div
                      key={friend.friendshipId}
                      className="flex items-center justify-between p-4 bg-surface border border-surface-variant rounded-xl shadow-[0px_4px_16px_rgba(0,0,0,0.01)] hover:shadow-[0px_6px_20px_rgba(0,0,0,0.03)] transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar bubble */}
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-label-md select-none shrink-0">
                          {getInitials(friend.fullName, friend.email)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-label-md text-label-md text-on-surface font-semibold truncate">
                            {friend.fullName || 'Active User'}
                          </h4>
                          <p className="text-secondary text-body-sm truncate">{friend.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnfriend(friend.userId, friend.friendshipId, friend.fullName || friend.email)}
                        disabled={pendingActionIds.includes(friend.friendshipId)}
                        className="px-3.5 py-1.5 text-xs text-error font-bold hover:bg-error-container/20 border border-error/20 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {pendingActionIds.includes(friend.friendshipId) ? 'Processing...' : 'Unfriend'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center text-secondary select-none">
                    <span className="material-symbols-outlined text-[48px] text-secondary/30 mb-2">
                      group_off
                    </span>
                    <span className="text-body-md font-medium">No friends found</span>
                    <p className="text-xs text-secondary/60 mt-1">
                      {searchQuery ? 'Try matching another name or email.' : 'Invite friends using their emails above.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Active SubTab 2: INCOMING REQUESTS */}
            {activeSubTab === 'incoming' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredIncoming.length > 0 ? (
                  filteredIncoming.map((req) => (
                    <div
                      key={req.requestId}
                      className="flex items-center justify-between p-4 bg-surface border border-surface-variant rounded-xl shadow-[0px_4px_16px_rgba(0,0,0,0.01)]"
                    >
                      <div className="flex items-center gap-3 min-w-0 mr-3">
                        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-label-md select-none shrink-0">
                          {getInitials(req.senderName, req.senderEmail)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-label-md text-label-md text-on-surface font-semibold truncate">
                            {req.senderName || 'Anonymous'}
                          </h4>
                          <p className="text-secondary text-body-sm truncate">{req.senderEmail}</p>
                          <p className="text-[10px] text-secondary/60 mt-0.5">
                            Received {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 select-none shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req.requestId)}
                          disabled={pendingActionIds.includes(req.requestId)}
                          className="px-3.5 py-1.5 text-xs bg-primary text-on-primary hover:bg-primary/90 font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.requestId)}
                          disabled={pendingActionIds.includes(req.requestId)}
                          className="px-3.5 py-1.5 text-xs text-secondary hover:text-on-surface hover:bg-surface-variant font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center text-secondary select-none">
                    <span className="material-symbols-outlined text-[48px] text-secondary/30 mb-2">
                      mail_lock
                    </span>
                    <span className="text-body-md font-medium">No pending incoming requests</span>
                  </div>
                )}
              </div>
            )}

            {/* Active SubTab 3: OUTGOING REQUESTS */}
            {activeSubTab === 'outgoing' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOutgoing.length > 0 ? (
                  filteredOutgoing.map((req) => (
                    <div
                      key={req.requestId}
                      className="flex items-center justify-between p-4 bg-surface border border-surface-variant rounded-xl shadow-[0px_4px_16px_rgba(0,0,0,0.01)]"
                    >
                      <div className="flex items-center gap-3 min-w-0 mr-3">
                        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-label-md select-none shrink-0">
                          {getInitials(req.receiverName, req.receiverEmail)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-label-md text-label-md text-on-surface font-semibold truncate">
                            {req.receiverName || 'Pending User'}
                          </h4>
                          <p className="text-secondary text-body-sm truncate">{req.receiverEmail}</p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high border border-outline-variant/30 text-[10px] text-secondary font-semibold mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                            Pending
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancelRequest(req.requestId)}
                        disabled={pendingActionIds.includes(req.requestId)}
                        className="px-3.5 py-1.5 text-xs text-secondary hover:text-on-surface hover:bg-surface-variant font-bold border border-surface-variant rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Cancel Request
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center text-secondary select-none">
                    <span className="material-symbols-outlined text-[48px] text-secondary/30 mb-2">
                      drafts
                    </span>
                    <span className="text-body-md font-medium">No sent requests pending</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsView;
