import 'server-only';

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getRenderOpsConfig } from '@/lib/server/render/kill-switch';

const LOCAL_KEY_FILES = ['fal-api-key.local', '.fal-api-key.local'];

let cachedRemoteKey: { value: string; at: number } | null = null;
const REMOTE_TTL_MS = 60_000;

function readLocalFalKeyFile(): string {
  if (process.env.NODE_ENV === 'production') return '';
  for (const name of LOCAL_KEY_FILES) {
    try {
      const path = join(process.cwd(), name);
      if (!existsSync(path)) continue;
      const raw = readFileSync(path, 'utf8').trim();
      if (raw && !raw.startsWith('#')) return raw;
    } catch {
      /* ignore */
    }
  }
  return '';
}

function falKeyFromEnvOrFile(): string {
  return (
    process.env.FAL_KEY?.trim() ||
    process.env.FAL_API_KEY?.trim() ||
    process.env.RENDER_ACE_TOKEN?.trim() ||
    readLocalFalKeyFile() ||
    ''
  );
}

/** Fast check for env / local file / custom GPU endpoint (no Firestore round-trip). */
export function isFalAceConfigured(): boolean {
  return Boolean(falKeyFromEnvOrFile()) || Boolean(process.env.RENDER_ACE_ENDPOINT?.trim());
}

export async function resolveFalApiKey(): Promise<string> {
  const local = falKeyFromEnvOrFile();
  if (local) return local;

  const now = Date.now();
  if (cachedRemoteKey && now - cachedRemoteKey.at < REMOTE_TTL_MS) {
    return cachedRemoteKey.value;
  }

  const cfg = await getRenderOpsConfig();
  const remote = (cfg as { falApiKey?: string }).falApiKey?.trim() || '';
  cachedRemoteKey = { value: remote, at: now };
  return remote;
}

export async function isFalAceConfiguredAsync(): Promise<boolean> {
  if (Boolean(process.env.RENDER_ACE_ENDPOINT?.trim())) return true;
  const key = await resolveFalApiKey();
  return Boolean(key);
}

export function invalidateFalKeyCache(): void {
  cachedRemoteKey = null;
}
