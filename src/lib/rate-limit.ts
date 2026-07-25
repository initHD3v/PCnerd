export function createRateLimiter(options: { max: number; windowMs: number }) {
  const store = new Map<string, { count: number; resetAt: number }>();

  const prune = () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  };

  return {
    check(identifier: string): { allowed: boolean; remaining: number } {
      prune();
      const now = Date.now();
      const entry = store.get(identifier);
      if (!entry || now > entry.resetAt) {
        store.set(identifier, { count: 1, resetAt: now + options.windowMs });
        return { allowed: true, remaining: options.max - 1 };
      }
      if (entry.count >= options.max) {
        return { allowed: false, remaining: 0 };
      }
      entry.count++;
      return { allowed: true, remaining: options.max - entry.count };
    },
    reset(identifier: string): void {
      store.delete(identifier);
    },
  };
}
