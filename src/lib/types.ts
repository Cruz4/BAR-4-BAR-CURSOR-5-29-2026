import type { DropAudioMeta, DropPrice } from '@/lib/drop-commerce';
import type { ReleaseDiscoveryMetadata } from '@/lib/release-discovery';

export type ReleaseStatus = 'draft' | 'live' | 'unlisted';
export type DnaStatus = 'live' | 'unlisted';

export interface User {
  id: string;
  displayName: string;
  email?: string;
  /** Google/Firebase Auth avatar URL, captured on sign-in when available. */
  photoURL?: string;
  createdAt: string; // ISO 8601 string
  trialStartedAt?: string | null; // Legacy internal trial — no longer set on signup
  albums?: Album[];
  role?: 'admin' | 'artist';
  status?: 'active' | 'blocked';
  stripeCustomerId?: string;
  /** Stripe Connect account for First Drop artist payouts. */
  stripeConnectAccountId?: string;
  stripeConnectCountry?: string;
  stripeConnectDetailsSubmitted?: boolean;
  stripeConnectTransfersActive?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
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
  /** ISO timestamp — Scene home guided tour completed or skipped */
  sceneTutorialCompletedAt?: string;
  /** ISO timestamp — saved first custom DNA strain during Pro trial quest */
  proTrialWinCompletedAt?: string;
  /** ISO timestamp — user skipped the Pro trial win quest */
  proTrialWinDismissedAt?: string;
  /** True when this email already consumed one-time welcome Ink / trial (set server-side). */
  returningIdentity?: boolean;
  trialInkAbVariant?: 'control' | 'h1_zero';
  /** ISO timestamp — leaderboard / public profile intro acknowledged */
  studioPrivacyIntroCompletedAt?: string;
  /** ISO timestamp — Pro workflow preview expires (export, unlimited tracks, etc.). */
  proFeaturePreviewExpiresAt?: string | null;
  /** Welcome Ink deferred until Firebase email is verified. */
  pendingWelcomeInk?: boolean;
  /** ISO — branded welcome email sent after verified signup grant. */
  welcomeEmailSentAt?: string;
  /** ISO timestamp — first meaningful activation (e.g. Studio Draft complete). */
  activatedAt?: string | null;
  /** Free tier: user-pinned track ids (max 2) after Pro downgrade — rotation fills empty slots. */
  freeEditableTrackIds?: string[];
  /** ISO timestamp — user completed the post-downgrade “pick 2 tracks” flow. */
  freeEditableSelectionAt?: string;
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
  updatedAt?: string; // ISO 8601 string — last album-level edit
  coverArtUrl?: string;
  direction?: Direction;    
  tracks: Track[];
  /** Durable artist-chosen album sequence; track bodies remain in the tracks subcollection. */
  trackOrder?: string[];
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
  /** Durable paid-release identity. Kept separate from the optional DNA lyric page. */
  releaseShareId?: string;
  /** Draft audio is private; unlisted releases retain buyer access but leave public discovery. */
  releaseStatus?: ReleaseStatus;
  /** Snapshot timestamp for the most recent live press. */
  releaseSnapshotAt?: string;
  /** Admin-only release included free in every signed-in member's Library. */
  houseRelease?: boolean;
  /** Admin-controlled quiet announcement shown inside Library. */
  houseLibraryNotice?: boolean;
  /** Visibility of the separate DNA lyric page. */
  dnaStatus?: DnaStatus;
  /**
   * Links / embeds on the public DNA Drop page (YouTube, Spotify, etc.).
   * Included in the published snapshot; edit from the DNA Drop dialog.
   */
  dnaDropMedia?: string[];
  /** Album bundle price for Bar 4 Bar First Drops. */
  dropPrice?: DropPrice;
  /** Optional discovery tags for rails / search (additive). */
  releaseDiscovery?: ReleaseDiscoveryMetadata;
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
  updatedAt?: string; // ISO 8601 string — last sheet edit
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
  /** Private vocal reference recordings for this sheet (max 3). */
  sheetTakes?: import('@/lib/sheet-takes').SheetTake[];
  /** Persisted DNA/REMIX approval outputs for recovery into Draft Chest (cleared after migrate). */
  approvalDraftBacklog?: import('@/lib/approval-draft-history').ApprovalDraftSnapshot[];
  suggestedTitlesHistory?: string[][];
  isPublic?: boolean;
  shareId?: string;
  /** Durable paid-release identity. Kept separate from the optional DNA lyric page. */
  releaseShareId?: string;
  /** Draft audio is private; unlisted releases retain buyer access but leave public discovery. */
  releaseStatus?: ReleaseStatus;
  /** Snapshot timestamp for the most recent live press. */
  releaseSnapshotAt?: string;
  /** Admin-only release included free in every signed-in member's Library. */
  houseRelease?: boolean;
  /** Admin-controlled quiet announcement shown inside Library. */
  houseLibraryNotice?: boolean;
  /** Visibility of the separate DNA lyric page. */
  dnaStatus?: DnaStatus;
  /** Active Collab Sheet — live multi-user editing session id. */
  collabSheetId?: string;
  /**
   * Links / embeds on the public DNA Drop page (YouTube, Spotify, etc.).
   * Included in the published snapshot; edit from the DNA Drop dialog.
   */
  dnaDropMedia?: string[];
  /** Private song file + 30s preview for Bar 4 Bar First Drops. */
  dropAudio?: DropAudioMeta;
  /** Song price for Bar 4 Bar First Drops. */
  dropPrice?: DropPrice;
  /** When the artist attested they have rights to sell this recording (Press it live). */
  dropRightsAttestedAt?: string;
  /** Optional discovery tags for rails / search (additive). */
  releaseDiscovery?: ReleaseDiscoveryMetadata;
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
  /** Lightweight First Drops flags for Discover / share page. */
  hasDropAudio?: boolean;
  houseRelease?: boolean;
  houseLibraryNotice?: boolean;
  houseLibraryNoticeAt?: string;
  dropPriceSummary?: string;
  playCount?: number;
  previewCount?: number;
  purchaseCount?: number;
  lastPulseAt?: string;
  firstBuyerId?: string;
  firstBuyerName?: string;
  firstBuyerAt?: string;
  releaseStatus?: ReleaseStatus;
  dnaStatus?: DnaStatus;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  usdCost: number;
  /** Absolute ink magnitude (legacy spends used this as “spent”). */
  inkUsed: number;
  /**
   * Signed ink flow for ops UI: positive = credit (purchase/achievement),
   * negative = spend. When omitted, UI falls back to -inkUsed.
   */
  inkDelta?: number;
  details?: string;
  type: 'ai_request' | 'transaction' | 'system' | 'achievement';
  /** Set on achievement unlock / backfill rows for idempotent ops history. */
  achievementId?: string;
  backfilled?: boolean;
  unlockedAt?: string;
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
  /** Where this vault entry was saved from — drives album Load sections. */
  sourceKind?: 'album' | 'track';
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
