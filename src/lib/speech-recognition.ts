export type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'aborted'
  | 'audio-capture'
  | 'language-not-supported'
  | string;

export type BrowserSpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; 0?: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: SpeechRecognitionErrorCode }) => void) | null;
};

export function getBrowserSpeechRecognition(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua);
}

export function isLikelyUnreliableBrowserSpeech(): boolean {
  if (typeof navigator === 'undefined') return true;
  if (isMobileDevice()) return true;
  const ua = navigator.userAgent;
  if (/Firefox\//i.test(ua)) return true;
  if (/Edg\//i.test(ua)) return false;
  if (/Chrome\//i.test(ua) && !/OPR\//i.test(ua)) return false;
  if (/CriOS\//i.test(ua)) return false;
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return true;
  return true;
}

/** Mic constraints — heavy DSP can zero-out quiet mics on phones and Bluetooth headsets. */
export function getFreestyleAudioConstraints(): MediaTrackConstraints {
  if (isMobileDevice()) {
    return {
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
    };
  }
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
}

export function speechRecognitionErrorMessage(code: SpeechRecognitionErrorCode): string | null {
  switch (code) {
    case 'no-speech':
      return null;
    case 'network':
      return null;
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow the mic in your browser or device settings.';
    case 'audio-capture':
      return 'No microphone was detected. Plug in or enable a mic and try again.';
    case 'aborted':
      return null;
    case 'language-not-supported':
      return 'Speech recognition is not available for this language on your device.';
    default:
      return `Speech recognition failed (${code}). Try Chrome on desktop with a stable connection.`;
  }
}

export async function isCapacitorNativeApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function pickMediaRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

/** Raw bytes — keep under Gemini upload comfort (~90KB) */
export const MAX_TRANSCRIBE_BLOB_BYTES = 90_000;

export type AudioSpeechLevel = {
  rms: number;
  peak: number;
  decoded: boolean;
};

/** Skip API calls when the mic segment is effectively silent (avoids model hallucination). */
export const MIN_SPEECH_RMS = 0.008;
export const MIN_SPEECH_PEAK = 0.025;

export async function measureAudioSpeechLevel(blob: Blob): Promise<AudioSpeechLevel> {
  if (typeof window === 'undefined') {
    return { rms: 0, peak: 0, decoded: false };
  }

  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return { rms: 0, peak: 0, decoded: false };
  }

  const ctx = new AudioCtx();
  try {
    const buffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(buffer.slice(0));
    const samples = audioBuffer.getChannelData(0);
    if (!samples.length) {
      return { rms: 0, peak: 0, decoded: true };
    }

    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i]!;
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
      sumSquares += sample * sample;
    }

    return {
      rms: Math.sqrt(sumSquares / samples.length),
      peak,
      decoded: true,
    };
  } catch {
    return { rms: 0, peak: 0, decoded: false };
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

export function hasDetectableSpeech(level: AudioSpeechLevel, blobSizeBytes: number): boolean {
  // WebM decode often fails in-browser even when Gemini can transcribe the same blob.
  if (!level.decoded) {
    return blobSizeBytes >= 2000;
  }
  return level.rms >= MIN_SPEECH_RMS || level.peak >= MIN_SPEECH_PEAK;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
