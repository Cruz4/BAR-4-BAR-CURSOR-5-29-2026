
'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface UIStateContextType {
  isGenerating: boolean;
  setGenerating: (isGenerating: boolean, message?: string) => void;
  generatingMessage: string;
}

export const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export const UIStateProvider = ({ children }: { children: ReactNode }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('Generating...');

  const setGenerating = (generating: boolean, message = 'Generating...') => {
    setIsGenerating(generating);
    setGeneratingMessage(message);
  };

  return (
    <UIStateContext.Provider value={{ isGenerating, setGenerating, generatingMessage }}>
      {children}
    </UIStateContext.Provider>
  );
};
