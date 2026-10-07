'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type PresenceMap = Record<string, boolean>;

type PresenceContextValue = {
  map: PresenceMap;
  setPresent: (moduleId: string, present: boolean) => void;
};

const ArtistHomeModulePresenceContext = createContext<PresenceContextValue | null>(null);

export function ArtistHomeModulePresenceProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<PresenceMap>({});
  const setPresent = useCallback((moduleId: string, present: boolean) => {
    setMap((prev) => (prev[moduleId] === present ? prev : { ...prev, [moduleId]: present }));
  }, []);
  const value = useMemo(() => ({ map, setPresent }), [map, setPresent]);
  return (
    <ArtistHomeModulePresenceContext.Provider value={value}>
      {children}
    </ArtistHomeModulePresenceContext.Provider>
  );
}

export function useArtistHomeModulePresenceMap(): PresenceMap {
  return useContext(ArtistHomeModulePresenceContext)?.map ?? {};
}

/** Report whether this module is rendering real content (not an empty shell). */
export function useArtistHomeModulePresence(moduleId: string, present: boolean) {
  const setPresent = useContext(ArtistHomeModulePresenceContext)?.setPresent;
  const setPresentRef = useRef(setPresent);
  setPresentRef.current = setPresent;

  useEffect(() => {
    const report = setPresentRef.current;
    if (!report) return;
    report(moduleId, present);
    return () => report(moduleId, false);
  }, [moduleId, present]);
}
