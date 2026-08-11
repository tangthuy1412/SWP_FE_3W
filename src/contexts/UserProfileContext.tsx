/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { userService } from '../services/userService';

interface UserProfileContextValue {
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  avatarUrl: null,
  setAvatarUrl: () => {},
});

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    userService.getMyProfile().then((response) => {
      if (response.data && response.data.success) {
        setAvatarUrl(response.data.data.avatarUrl);
      }
    });
  }, []);

  return (
    <UserProfileContext.Provider value={{ avatarUrl, setAvatarUrl }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => useContext(UserProfileContext);
