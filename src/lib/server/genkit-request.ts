import 'server-only';

import { AsyncLocalStorage } from 'async_hooks';

const apiKeyStore = new AsyncLocalStorage<string | undefined>();

export function runWithGenkitContext<T>(
  customApiKey: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return apiKeyStore.run(customApiKey, fn);
}

/** Per-request Google AI key override for Genkit prompt/generate calls. */
export function getGenkitPromptOptions(): {
  config?: { apiKey?: string; maxOutputTokens?: number };
} {
  const apiKey = apiKeyStore.getStore();
  return {
    config: {
      ...(apiKey ? { apiKey } : {}),
      maxOutputTokens: 8192,
    },
  };
}
