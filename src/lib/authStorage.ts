const IDENTITY_KEYS = ['token', 'refreshToken', 'userEmail', 'userId', 'userRole', 'userFullName'] as const;

export const clearAuthenticatedUser = () => {
  IDENTITY_KEYS.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem('dashboardActiveTab');
};

export const normalizeRole = (role: string | null | undefined): 'ADMIN' | 'USER' =>
  role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
