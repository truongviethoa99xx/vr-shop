import { useEffect, useState } from 'react';

const STORAGE_KEY = 'showroom-3d-session-id';

const createUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for non-secure contexts, where crypto.randomUUID is unavailable.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

/**
 * A stable anonymous session id, persisted so a page refresh keeps the cart.
 * The backend scopes every cart row by this value; there is no login.
 */
export const useShowroomSession = () => {
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    let existing = null;

    try {
      existing = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Private mode / blocked storage: fall back to a per-tab session.
    }

    if (existing) {
      setSessionId(existing);
      return;
    }

    const created = createUuid();
    try {
      window.localStorage.setItem(STORAGE_KEY, created);
    } catch {
      /* non-persistent session is still usable */
    }
    setSessionId(created);
  }, []);

  return sessionId;
};

export default useShowroomSession;
