export interface User {
  id: string;
  displayName: string;
  email?: string;
  createdAt: string; // ISO 8601 string
  trialStartedAt?: string | null; // Pro workflow trial start (see TRIAL_DURATION_DAYS)
  albums?: Album[];
  role?: 'admin' | 'artist';
  status?: 'active' | 'blocked';
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'canceled' | 'none';
  subscriptionTier?: 'monthly' | 'yearly' | 'none';
  subscriptionId?: string;
  /** Unique code for refer-a-friend links */
  referralCode?: string;
  /** User id of referrer */
  referredBy?: string;
  /** Successful referrals credited (max 4) */
  referralCount?: number;
  /** First-touch ?ref= from marketing links (tiktok, ig, yt, etc.) */
  signupAttribution?: string;
  /** ISO timestamp — first lyrics-page guided tour completed or skipped */
  lyricsTutorialCompletedAt?: string;
  /** ISO timestamp — vault-page guided tour completed or skipped */
  vaultTutorialCompletedAt?: string;
  /** ISO timestamp — saved first custom DNA strain during Pro trial quest */
  proTrialWinCompletedAt?: string;
  /** ISO timestamp — user skipped the Pro trial win quest */
  proTrialWinDismissedAt?: string;
  /** ISO timestamp — leaderboard / public profile intro acknowledged */
  studioPrivacyIntroCompletedAt?: string;
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
  dnaPresets?: DnaPreset[];
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
  /** Stashed full song drafts (DNA & REMIX) — Draft Chest under Scratch Pad. */
  draftChest?: DraftChestEntry[];
  /** Persisted DNA/REMIX approval outputs for recovery into Draft Chest (cleared after migrate). */
  approvalDraftBacklog?: import('@/lib/approval-draft-history').ApprovalDraftSnapshot[];
  suggestedTitlesHistory?: string[][];
  isPublic?: boolean;
  shareId?: string;
}

/** How a lyric line was added — used for Studio Progress (written vs AI-generated). */
export type LineSource = 'written' | 'generated';

export interface Bar {
  idx: number;
  text: string;
  accepted: boolean;
  rhymeKey: string;
  syllables: number;
  justGenerated?: boolean;
  /** Set when the user types or edits; AI flows set `generated`. Mixed bars credit as written if any line is written. */
  lineSource?: LineSource;
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
  data: any; // Serialized Album or Track (see dna-drop.ts enrich helpers)
  createdAt: string;
  updatedAt?: string;
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
  /** Lyrical technique DNA (flow, rhyme architecture) — aura-only, no literal phrases. */
  styleAnalysis?: string;
  styleMetrics?: {
    vocabularyScore: number;
    rhymeComplexity: number;
    cadenceMap: string;
  };
}

export type StyleMetrics = {
  vocabularyScore: number;
  rhymeComplexity: number;
  cadenceMap: string;
};

export type DnaPreset = {
  name: string;
  createdAt: string;
  sourceTrackTitle?: string;
  analysis?: WizardAnalysis | Partial<WizardAnalysis>;
  mapping: Direction;
  intents?: string[];
  structure?: Array<{ name: string; bars: number; enabled: boolean }>;
  structureGuide?: string;
  styleAnalysis?: string;
  styleMetrics?: StyleMetrics;
};

export interface WizardDirection {
  name: string;
  description: string;
  /** 0–100: how strongly this remix pivot should influence synthesis. */
  weight?: number;
}

export type DraftChestSource = 'full-draft' | 'remix';

export type DraftChestEntry = {
  id: string;
  kind: 'sheet';
  sections: TrackSection[];
  source: DraftChestSource;
  label: string;
  savedAt: string;
  meta?: {
    lineCount?: number;
  };
};

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
