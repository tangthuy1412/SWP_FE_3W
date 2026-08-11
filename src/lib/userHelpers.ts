/**
 * Saves a user's ID, fullName, and email mapping to the persistent known users directory in localStorage.
 */
export const saveKnownUser = (
  userId: string | number | null | undefined,
  fullName: string | null | undefined,
  email: string | null | undefined
): void => {
  if (!userId) return;
  try {
    const knownUsersStr = localStorage.getItem('knownUsers') || '{}';
    const knownUsers = JSON.parse(knownUsersStr);
    
    // Save both fullName and email under user entry for maximum flexibility
    knownUsers[String(userId)] = {
      fullName: fullName || '',
      email: email || ''
    };
    
    localStorage.setItem('knownUsers', JSON.stringify(knownUsers));
  } catch (e) {
    console.error('Error saving known user to localStorage', e);
  }
};

/**
 * Resolves the owner's email based on their user ID.
 * Returns the current user's email if the ID belongs to the logged-in user.
 * Looks up in the locally stored known users registry.
 * Falls back to default mock emails or a generated user email format.
 */
export const resolveOwnerEmail = (userId: number | string | null | undefined): string => {
  if (!userId) return 'Unknown';
  
  const currentUserId = localStorage.getItem('userId');
  const currentEmail = localStorage.getItem('userEmail');
  
  if (String(userId) === String(currentUserId) && currentEmail) {
    return currentEmail;
  }
  
  try {
    const knownUsersStr = localStorage.getItem('knownUsers') || '{}';
    const knownUsers = JSON.parse(knownUsersStr);
    const userEntry = knownUsers[String(userId)];
    
    if (userEntry) {
      if (typeof userEntry === 'object' && userEntry.email) {
        return userEntry.email;
      }
      if (typeof userEntry === 'string' && userEntry.includes('@')) {
        return userEntry;
      }
    }
  } catch (e) {
    console.error('Error reading known users from localStorage', e);
  }
  
  // Static backend mock seed accounts fallbacks
  const numId = Number(userId);
  if (numId === 1) return 'long@example.com';
  if (numId === 9) return 'sarah@example.com';
  
  // Cleaner email-based fallback format
  return `user${userId}@example.com`;
};

/**
 * Resolves the owner's full name based on their user ID.
 * Returns the current user's full name if the ID belongs to the logged-in user.
 */
export const resolveOwnerName = (userId: number | string | null | undefined): string => {
  if (!userId) return 'Unknown';
  
  const currentUserId = localStorage.getItem('userId');
  const currentFullName = localStorage.getItem('userFullName') || 'Me';
  
  if (String(userId) === String(currentUserId)) {
    return currentFullName;
  }
  
  try {
    const knownUsersStr = localStorage.getItem('knownUsers') || '{}';
    const knownUsers = JSON.parse(knownUsersStr);
    const userEntry = knownUsers[String(userId)];
    
    if (userEntry) {
      if (typeof userEntry === 'object' && userEntry.fullName) {
        return userEntry.fullName;
      }
      if (typeof userEntry === 'string') {
        return userEntry;
      }
    }
  } catch (e) {
    console.error('Error reading known users from localStorage', e);
  }
  
  const numId = Number(userId);
  if (numId === 1) return 'Long Nguyen';
  if (numId === 9) return 'Sarah J.';
  
  return `User ${userId}`;
};
