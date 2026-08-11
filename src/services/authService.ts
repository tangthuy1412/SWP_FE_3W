import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';
import type { BackendResponse } from './documentService';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  userId: number;
  email: string;
  role: string;
  fullName?: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface VerifyOtpResponse {
  message: string;
}

export interface ResendOtpResponse {
  mesage: string; // note backend typo 'mesage'
  email: string;
}

export const authService = {
  async login(email: string, password: string): Promise<ApiResponse<BackendResponse<LoginResponse>>> {
    return apiClient.post<BackendResponse<LoginResponse>>('/auth/login', { email, password });
  },

  async register(fullName: string, email: string, password: string): Promise<ApiResponse<BackendResponse<RegisterResponse>>> {
    return apiClient.post<BackendResponse<RegisterResponse>>('/auth/register', { fullName, email, password });
  },

  async verifyOtp(email: string, otp: string): Promise<ApiResponse<BackendResponse<VerifyOtpResponse>>> {
    return apiClient.post<BackendResponse<VerifyOtpResponse>>('/auth/verify-otp', { email, otp });
  },

  async resendOtp(email: string): Promise<ApiResponse<BackendResponse<ResendOtpResponse>>> {
    return apiClient.post<BackendResponse<ResendOtpResponse>>('/auth/resend-otp', { email });
  },

  async logout(refreshToken: string): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.post<BackendResponse<null>>('/auth/logout', { refreshToken });
  },

  async forgotPassword(email: string): Promise<ApiResponse<BackendResponse<{ message: string; email: string }>>> {
    return apiClient.post<BackendResponse<{ message: string; email: string }>>('/auth/forgot-password', { email });
  },

  async verifyForgotPasswordOtp(email: string, otp: string): Promise<ApiResponse<BackendResponse<{ message: string }>>> {
    return apiClient.post<BackendResponse<{ message: string }>>('/auth/verify-forgot-password-otp', { email, otp });
  },

  async resetPassword(email: string, newPassword: string): Promise<ApiResponse<BackendResponse<null>>> {
    return apiClient.post<BackendResponse<null>>('/auth/reset-password', { email, newPassword });
  },

  getGoogleLoginUrl(): string {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
    const baseUrl = apiBaseUrl.endsWith('/api') ? apiBaseUrl.slice(0, -4) : apiBaseUrl;
    return `${baseUrl}/oauth2/authorization/google`;
  }
};

export default authService;
