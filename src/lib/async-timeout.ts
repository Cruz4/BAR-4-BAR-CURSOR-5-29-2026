export class AsyncTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(
      `${label} timed out after ${Math.round(ms / 1000)}s. Check your connection, or allow firestore.googleapis.com if an ad blocker is enabled.`
    );
    this.name = 'AsyncTimeoutError';
  }
}

export function withAsyncTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AsyncTimeoutError(label, ms)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
