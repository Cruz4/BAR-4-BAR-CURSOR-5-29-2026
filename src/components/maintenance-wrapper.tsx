'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MaintenancePage from '@/app/maintenance/page';

const SECRET_CODE = 'letmein26';
const SESSION_STORAGE_KEY = 'b4b_maintenance_override';

export function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');

  // Check session storage on initial load
  useEffect(() => {
    try {
      const isUnlocked = sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';
      if (isUnlocked) {
        setUnlocked(true);
      }
    } catch {
      // sessionStorage may not be available
      console.warn('Could not access session storage.');
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (input === SECRET_CODE) {
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
        } catch {
            // sessionStorage may not be available
        }
        setUnlocked(true);
      }
      setInput(''); // Reset on Enter regardless of success
    } else if (event.key.length === 1) { // Append only single characters
      setInput((prevInput) => (prevInput + event.key).slice(-SECRET_CODE.length));
    } else if (event.key === 'Backspace') {
       setInput((prevInput) => prevInput.slice(0, -1));
    }
  }, [input]);

  useEffect(() => {
    if (!unlocked) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [unlocked, handleKeyDown]);


  if (unlocked) {
    return <>{children}</>;
  }

  return <MaintenancePage />;
}
