export interface User {
  id: string;
  displayName: string;
  email?: string;
  createdAt: string; // ISO 8601 string
  trialStartedAt?: string; // For 48h hard-lock
  albums?: Album[];
  role?: 'admin' | 'artist';
  status?: 'active' | 'blocked';
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'canceled' | 'none';
  subscriptionTier?: 'monthly' | 'yearly' | 'none';
  subscriptionId?: string;
}

export type Direction = {
  enabled?: boolean; 
  setting_world?: string;   // “It takes place in ____.”
  emotion_core?: string;    // “It feels like ____.”
  trigger_moment?: string;  // “Everything changed when ____.”
  message_truth?: string;   // “Deep down, it’s really about ____.”
  tone_palette?: string;    // “It sounds/looks like ____.” (scene/color/texture)
  updatedAt?: string;       // ISO
  inheritFromAlbum?: boolean; 
};

export interface Album {
  id: string;
  ownerId: string;
  title: string;
  theme: string;
  message?: string;
  thingsToSay?: string[];
  createdAt: string; // ISO 8601 string
  coverArtUrl?: string;
  direction?: Direction;    
  tracks: Track[];
  dnaPresets?: Array<{
    name: string;
    createdAt: string;
    sourceTrackTitle?: string;
    analysis: WizardAnalysis;
    mapping: Direction;
  }>;
  stylePresets?: Array<{
    name: string;
    createdAt: string;
    analysis: string;
    metrics: {
      vocabularyScore: number;
      rhymeComplexity: number;
      cadenceMap: string;
    };
  }>;
  isPublic?: boolean;
  shareId?: string;
}

export interface TrackVibe {
  enabled?: boolean;
  genre: string; 
  tempoBPM: number; 
  feeling: string[]; 
  instrumentation?: string; 
  productionNotes?: string; 
  ambientIntensity?: number;
  name?: string; // For saved presets
}

export interface Track {
  id:string;
  albumId: string;
  ownerId: string;
  title: string;
  coverArtUrl?: string; 
  vibe: TrackVibe;
  vibePresets?: TrackVibe[];
  intentRefs: string[]; 
  checkedIntents?: string[];
  intentsEnabled?: boolean; // Master Toggle for Intents
  styleEnabled?: boolean; // Master Toggle for Style Influence
  endWith?: string | null;
  sections: TrackSection[];
  status: 'in_progress' | 'complete';
  createdAt: string; // ISO 8601 string
  direction?: Partial<Direction> & { inheritFromAlbum?: boolean; enabled?: boolean; };
  guardrails?: {
    enabled: boolean;
    negativePrompt?: string;
    forbiddenWords?: string[];
    mustIncludeWords?: string[];
  };
  specialInstructions?: string; // Persisted manual guidance for the AI
  rhymeGroups?: Array<{ words: string[] }>;
  rhymeHighlightingEnabled?: boolean;
  relayData?: WizardState;
  suggestedTitlesHistory?: string[][];
  isPublic?: boolean;
  shareId?: string;
}

export interface Bar {
  idx: number;
  text: string;
  accepted: boolean;
  rhymeKey: string;
  syllables: number;
  justGenerated?: boolean;
}

export interface TrackSection {
  id: string;
  type: 'verse' | 'hook' | 'bridge' | 'intro' | 'outro' | 'pre' | 'chorus';
  bars: Bar[];
}

export interface StyleAnalysis {
    timestamp: string;
    analysis: string;
    metrics?: {
      vocabularyScore: number;
      rhymeComplexity: number;
      cadenceMap: string;
    };
}

export interface StyleProfile {
    id: string;
    ownerId: string;
    history: StyleAnalysis[];
    trainingRefs: string[];
    updatedAt: string;
}

export type AIUsageLog = {
  id: string;
  flowName: string;
  timestamp: string; 
  inkCost: number;
  status: 'success' | 'error';
  details?: string; 
};

export interface ProjectShare {
  id: string;
  type: 'album' | 'track';
  projectId: string;
  ownerId: string;
  ownerName: string;
  data: any; // Serialized Album or Track
  createdAt: string;
  views: number;
  imports: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  usdCost: number; 
  inkUsed: number; 
  details?: string;
  type: 'ai_request' | 'transaction' | 'system';
}

export interface BugReport {
  id: string;
  userId: string;
  userName: string;
  message: string;
  errorDetails?: string;
  path: string;
  timestamp: string;
  status: 'new' | 'resolved';
}

export interface WizardAnalysis {
  themes: string[];
  motifs: string[];
  emotionalTone: {
    primaryEmotion: string;
    secondaryEmotion: string;
    valence: number; 
    intensity: number;
  };
  emotionalShift: string;
  narrativeArc: string;
  structure: string;
  pov: string;
  tense: string;
  voiceStyle: string;
  whatMakesItWork: string;
}

export interface WizardDirection {
  name: string;
  description: string;
}

export interface WizardGeneratedVariant {
  title: string;
  sections: Array<{
    name: string;
    bars: string[];
  }>;
}

export type WizardState = {
  lyrics: string;
  analysis: WizardAnalysis | null;
  directions: WizardDirection[] | null;
  selectedDirections: WizardDirection[];
  generatedVariant: WizardGeneratedVariant | null;
  excludedWords: string;
};
