const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export const apiClient = {
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    // Chuẩn hóa header cho request JSON; FormData được giữ nguyên để browser tự gắn boundary.
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Gắn JWT hiện tại để backend xác định user và kiểm tra quyền truy cập document/chat.
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const status = response.status;

      if (status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              if (refreshData && refreshData.success && refreshData.data) {
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshData.data;
                localStorage.setItem('token', newAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                // Token đã được refresh thì thử lại chính request chat/document ban đầu một lần.
                const retryHeaders = new Headers(options.headers);
                if (!retryHeaders.has('Content-Type') && !(options.body instanceof FormData)) {
                  retryHeaders.set('Content-Type', 'application/json');
                }
                retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
                const retryConfig: RequestInit = {
                  ...options,
                  headers: retryHeaders,
                };
                const retryResponse = await fetch(url, retryConfig);
                const retryStatus = retryResponse.status;
                const retryContentType = retryResponse.headers.get('content-type');
                let retryData: unknown = null;
                if (retryContentType && retryContentType.includes('application/json')) {
                  retryData = await retryResponse.json();
                } else {
                  retryData = await retryResponse.text();
                }

                if (retryResponse.ok) {
                  return {
                    status: retryStatus,
                    data: retryData as T,
                  };
                }
              }
            }
          } catch (refreshErr) {
            console.error('Auto token refresh failed:', refreshErr);
          }
        }

        // Khi refresh thất bại, xóa credential cũ và đưa user về login để tránh tiếp tục gọi API không xác thực.
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/register' && path !== '/verify-otp' && path !== '/dashboard') {
          window.location.href = '/login';
        }
      }

      if (status === 204) {
        return { status, data: undefined as unknown as T };
      }

      const contentType = response.headers.get('content-type');
      let data: unknown = null;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        let errorMessage = 'An error occurred during request';

        if (data && typeof data === 'object') {
          const resObj = data as Record<string, unknown>;
          if ('errors' in resObj && Array.isArray(resObj.errors) && resObj.errors.length > 0) {
            errorMessage = resObj.errors
              .map((err) => {
                if (err && typeof err === 'object') {
                  const errObj = err as Record<string, unknown>;
                  if (typeof errObj.message === 'string') {
                    return typeof errObj.field === 'string'
                      ? `${errObj.field}: ${errObj.message}`
                      : errObj.message;
                  }
                }
                return String(err);
              })
              .join(', ');
          } else if ('message' in resObj && typeof resObj.message === 'string') {
            errorMessage = resObj.message;
          }
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else {
          errorMessage = response.statusText || errorMessage;
        }

        return {
          status,
          error: errorMessage,
        };
      }

      return {
        status,
        data: data as T,
      };
    } catch (err: unknown) {
      return {
        status: 500,
        error: err instanceof Error ? err.message : 'Network connectivity error',
      };
    }
  },

  get<T>(endpoint: string, options?: Omit<RequestInit, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestInit, 'method' | 'body'>) {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestInit, 'method' | 'body'>) {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  delete<T>(endpoint: string, options?: Omit<RequestInit, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
