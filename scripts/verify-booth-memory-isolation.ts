export {};

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

  const {
    BOOTH_MEMORY_KEY,
    boothMemoryFromTrack,
    dismissBoothMemory,
    readLocalBoothMemory,
    visibleBoothMemory,
    writeLocalBoothMemory,
  } = await import('../src/lib/scene/booth-memory');

const ownerA = 'artist-a';
const ownerB = 'artist-b';
const path = '/albums/album-a/tracks/track-a';
const memoryA = boothMemoryFromTrack({
  ownerId: ownerA,
  path,
  track: { title: 'Private draft A', sections: [], status: 'in_progress' },
  albumTitle: 'Private album A',
});

assert(memoryA, 'An in-progress owned track should create Booth Memory.');
writeLocalBoothMemory(memoryA);
assert(readLocalBoothMemory(ownerA)?.trackTitle === 'Private draft A', 'The owner should read their own cache.');

storage.setItem(BOOTH_MEMORY_KEY, JSON.stringify(memoryA));
assert(readLocalBoothMemory(ownerA)?.ownerId === ownerA, 'An unscoped legacy record must never replace owned memory.');
assert(storage.getItem(BOOTH_MEMORY_KEY) === null, 'The unscoped legacy record should be purged.');

assert(readLocalBoothMemory(ownerB) === null, 'A second account must not read the first account cache.');
assert(storage.getItem(`${BOOTH_MEMORY_KEY}:${ownerA}`) === null, 'Foreign account cache should be purged on account change.');

storage.setItem(`${BOOTH_MEMORY_KEY}:${ownerB}`, JSON.stringify(memoryA));
assert(readLocalBoothMemory(ownerB) === null, 'A forged owner mismatch must fail closed.');
assert(storage.getItem(`${BOOTH_MEMORY_KEY}:${ownerB}`) === null, 'A mismatched cache should be removed.');

const memoryB = boothMemoryFromTrack({
  ownerId: ownerB,
  path: '/albums/album-b/tracks/track-b',
  track: { title: 'Draft B', sections: [], status: 'in_progress' },
});
assert(memoryB, 'The second account should be able to create its own memory.');
writeLocalBoothMemory(memoryB);
dismissBoothMemory(memoryB);
assert(visibleBoothMemory(memoryB) === null, 'Dismissal should remain scoped and hide the owner memory.');

assert(
  boothMemoryFromTrack({
    ownerId: ownerA,
    path,
    track: { title: 'Finished', sections: [], status: 'complete' },
  }) === null,
  'Completed tracks must never create Booth Memory.'
);

  console.log('Booth Memory account-isolation verification passed.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
