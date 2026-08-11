import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';
import type { BackendResponse } from './documentService';

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  description: string | null;
  storageLimitGb: number;
  allowedFormats: string;
  maxUploadSizeMb: number;
  multipleDocuments: boolean;
  videoUpload: boolean;
  monthlyTokenLimit: number;
  active: boolean;
}

export type SubscriptionPlanPayload = Omit<SubscriptionPlan, 'id' | 'active'>;

export interface UserSubscription {
  subscriptionId: number;
  status: string; // e.g. "ACTIVE", "EXPIRED"
  startDate: string;
  endDate: string;
  planName: string;
  price: number;
  durationDays: number;
  storageLimitGb: number;
  allowedFormats: string;
  maxUploadSizeMb: number;
  multipleDocuments: boolean;
  videoUpload: boolean;
  monthlyTokenLimit: number;
}

export interface PaymentRevenue {
  totalRevenue: number;
  totalTransactions: number;
}

export interface PurchaseResponse {
  paymentId: number;
  transactionNo: string;
  paymentUrl: string;
  status: string;
}

export interface SystemOrder {
  paymentId: number;
  transactionNo: string;
  userId: number;
  userEmail: string;
  planId: number;
  planName: string;
  amount: number;
  paymentMethod: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  responseCode: string;
  createdAt: string;
  paidAt: string;
}

export interface UserPaymentHistory {
  paymentId: number;
  planName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  paidAt: string;
}

export const subscriptionService = {
  async getSubscriptionPlans(): Promise<ApiResponse<BackendResponse<SubscriptionPlan[]>>> {
    return apiClient.get<BackendResponse<SubscriptionPlan[]>>('/subscription-plans');
  },

  async createSubscriptionPlan(planData: SubscriptionPlanPayload): Promise<ApiResponse<BackendResponse<SubscriptionPlan>>> {
    return apiClient.post<BackendResponse<SubscriptionPlan>>('/subscription-plans', planData);
  },

  async updateSubscriptionPlan(
    id: number,
    planData: SubscriptionPlanPayload
  ): Promise<ApiResponse<BackendResponse<SubscriptionPlan>>> {
    return apiClient.put<BackendResponse<SubscriptionPlan>>(`/subscription-plans/${id}`, planData);
  },

  async deleteSubscriptionPlan(id: number): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.delete<BackendResponse<null>>(`/subscription-plans/${id}`);
  },

  async purchasePlan(planId: number): Promise<ApiResponse<BackendResponse<{ paymentUrl: string }>>> {
    return apiClient.post<BackendResponse<{ paymentUrl: string }>>('/payments/purchase', { planId, paymentMethod: 'VNPAY' });
  },

  async getMySubscription(): Promise<ApiResponse<BackendResponse<UserSubscription>>> {
    // Upload modal dùng maxUploadSizeMb để cảnh báo sớm file không phải video; backend vẫn validate chính thức.
    return apiClient.get<BackendResponse<UserSubscription>>('/subscriptions/me');
  },

  async getMyPaymentHistory(): Promise<ApiResponse<BackendResponse<UserPaymentHistory[]>>> {
    return apiClient.get<BackendResponse<UserPaymentHistory[]>>('/payments/history');
  },

  async getRevenue(): Promise<ApiResponse<BackendResponse<PaymentRevenue>>> {
    return apiClient.get<BackendResponse<PaymentRevenue>>('/payments/revenue');
  },

  async verifyVNPayPayment(queryString: string): Promise<ApiResponse<BackendResponse<{ transactionNo: string; status: string; alreadyProcessed: boolean }>>> {
    return apiClient.get<BackendResponse<{ transactionNo: string; status: string; alreadyProcessed: boolean }>>(`/payments/vnpay-return${queryString}`);
  },

  async getAllSystemOrders(page = 0, size = 100, status?: string): Promise<ApiResponse<BackendResponse<{
    payments: SystemOrder[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  }>>> {
    let url = `/payments?page=${page}&size=${size}`;
    if (status) {
      url += `&status=${status}`;
    }
    return apiClient.get<BackendResponse<{
      payments: SystemOrder[];
      page: number;
      size: number;
      totalElements: number;
      totalPages: number;
    }>>(url);
  },
};

export default subscriptionService;
