export type CoWriterSectionKey =
  | 'dna'
  | 'vibe'
  | 'intents'
  | 'guardrails'
  | 'coWriter'
  | 'creativeEffects'
  | 'scratchPad';

export type CoWriterSections = Record<CoWriterSectionKey, boolean>;

export type TrackUILayout = {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  sections: CoWriterSections;
};

export const DEFAULT_SECTIONS_CLOSED: CoWriterSections = {
  dna: false,
  vibe: false,
  intents: false,
  guardrails: false,
  coWriter: false,
  creativeEffects: false,
  scratchPad: false,
};

export const DEFAULT_TRACK_UI: TrackUILayout = {
  leftCollapsed: false,
  rightCollapsed: false,
  sections: DEFAULT_SECTIONS_CLOSED,
};

const storageKey = (trackId: string) => `b4b-track-ui-${trackId}`;

export function loadTrackUILayout(trackId: string): TrackUILayout {
  if (typeof window === 'undefined') return DEFAULT_TRACK_UI;
  try {
    const raw = localStorage.getItem(storageKey(trackId));
    if (!raw) return DEFAULT_TRACK_UI;
    const parsed = JSON.parse(raw) as Partial<TrackUILayout>;
    return {
      leftCollapsed: parsed.leftCollapsed ?? false,
      rightCollapsed: parsed.rightCollapsed ?? false,
      sections: { ...DEFAULT_SECTIONS_CLOSED, ...parsed.sections },
    };
  } catch {
    return DEFAULT_TRACK_UI;
  }
}

export function saveTrackUILayout(trackId: string, state: TrackUILayout) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(trackId), JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}
