import 'server-only';

import { resolveFalApiKey, isFalAceConfigured } from '@/lib/server/render/fal-config';

export type RenderAceMode = 'local' | 'fal' | 'auto';

export function getLocalAceBaseUrl(): string {
  const raw = process.env.RENDER_ACE_LOCAL_BASE?.trim() || 'http://127.0.0.1:8001';
  return raw.replace(/\/$/, '');
}

export function getRenderAceMode(): RenderAceMode {
  const mode = process.env.RENDER_ACE_MODE?.trim().toLowerCase();
  if (mode === 'local' || mode === 'fal' || mode === 'auto') return mode;
  return 'auto';
}

export function getLocalAceApiKey(): string {
  return (
    process.env.RENDER_ACE_LOCAL_API_KEY?.trim() ||
    process.env.ACESTEP_API_KEY?.trim() ||
    ''
  );
}

export async function isLocalAceHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${getLocalAceBaseUrl()}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { code?: number; data?: { status?: string } };
    return json.code === 200 || json.data?.status === 'ok';
  } catch {
    return false;
  }
}

/** True when sheet-to-song can run (local GPU, custom worker, or optional fal). */
export async function isAceRenderConfiguredAsync(): Promise<boolean> {
  if (Boolean(process.env.RENDER_ACE_ENDPOINT?.trim())) return true;

  const mode = getRenderAceMode();
  if (mode === 'local') {
    if (await isLocalAceHealthy()) return true;
    const key = await resolveFalApiKey();
    return Boolean(key);
  }
  if (mode === 'fal') {
    const key = await resolveFalApiKey();
    return Boolean(key);
  }

  if (await isLocalAceHealthy()) return true;
  const key = await resolveFalApiKey();
  return Boolean(key);
}

export function isAceRenderConfiguredSync(): boolean {
  return isFalAceConfigured() || Boolean(process.env.RENDER_ACE_LOCAL_BASE?.trim());
}

export async function shouldUseLocalAceFirst(): Promise<boolean> {
  const mode = getRenderAceMode();
  if (mode === 'fal') return false;
  if (mode === 'local') return true;
  return await isLocalAceHealthy();
}
