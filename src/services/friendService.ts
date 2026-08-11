import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';
import type { BackendResponse } from './documentService';

export interface FriendRequestResponse {
  requestId: number;
  senderId: number;
  senderName: string;
  senderEmail: string;
  receiverId: number;
  receiverName: string;
  receiverEmail: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  respondedAt: string | null;
}

export interface FriendResponse {
  friendshipId: number;
  userId: number;
  fullName: string;
  email: string;
  createdAt: string;
}

export const friendService = {
  async getFriends(): Promise<ApiResponse<BackendResponse<FriendResponse[]>>> {
    return apiClient.get<BackendResponse<FriendResponse[]>>('/friends');
  },

  async unfriend(friendId: number): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(`/friends/${friendId}`);
  },

  async sendFriendRequest(email: string): Promise<ApiResponse<BackendResponse<FriendRequestResponse>>> {
    return apiClient.post<BackendResponse<FriendRequestResponse>>('/friends/request', { email });
  },

  async getIncomingRequests(): Promise<ApiResponse<BackendResponse<FriendRequestResponse[]>>> {
    return apiClient.get<BackendResponse<FriendRequestResponse[]>>('/friends/requests/incoming');
  },

  async getOutgoingRequests(): Promise<ApiResponse<BackendResponse<FriendRequestResponse[]>>> {
    return apiClient.get<BackendResponse<FriendRequestResponse[]>>('/friends/requests/outgoing');
  },

  async acceptFriendRequest(requestId: number): Promise<ApiResponse<BackendResponse<FriendRequestResponse>>> {
    return apiClient.post<BackendResponse<FriendRequestResponse>>(`/friends/requests/${requestId}/accept`);
  },

  async rejectFriendRequest(requestId: number): Promise<ApiResponse<BackendResponse<FriendRequestResponse>>> {
    return apiClient.post<BackendResponse<FriendRequestResponse>>(`/friends/requests/${requestId}/reject`);
  },

  async cancelFriendRequest(requestId: number): Promise<ApiResponse<BackendResponse<FriendRequestResponse>>> {
    return apiClient.delete<BackendResponse<FriendRequestResponse>>(`/friends/requests/${requestId}/cancel`);
  },
};

export default friendService;
