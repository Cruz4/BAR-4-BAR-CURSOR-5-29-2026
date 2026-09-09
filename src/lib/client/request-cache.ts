type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/** In-flight dedupe + short TTL cache for hot client API reads. */
export class RequestCache<T> {
  private resolved = new Map<string, CacheEntry<T>>();
  private inflight = new Map<string, Promise<T>>();

  constructor(private readonly ttlMs: number) {}

  bust(key?: string) {
    if (key) {
      this.resolved.delete(key);
      this.inflight.delete(key);
      return;
    }
    this.resolved.clear();
    this.inflight.clear();
  }

  async get(key: string, loader: () => Promise<T>): Promise<T> {
    const hit = this.resolved.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = loader()
      .then((value) => {
        this.resolved.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        this.inflight.delete(key);
        return value;
      })
      .catch((err) => {
        this.inflight.delete(key);
        throw err;
      });

    this.inflight.set(key, promise);
    return promise;
  }
}
