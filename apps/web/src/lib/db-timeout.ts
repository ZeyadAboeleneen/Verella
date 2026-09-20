/**
 * Bounds a DB-backed promise so an unreachable database turns into a rejection
 * the caller's fallback can catch, instead of an RSC render that hangs on a
 * skeleton forever (mysql2's pool queues waiting queries with no time bound
 * when the host is down).
 */
export function withDbTimeout<T>(promise: Promise<T>, ms = 12_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error(`Database query timed out after ${ms}ms`)), ms);
      // Don't hold the process open for the timer in scripts/tests.
      (timer as { unref?: () => void }).unref?.();
    }),
  ]);
}
