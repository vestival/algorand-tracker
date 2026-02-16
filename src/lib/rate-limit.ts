type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) {
    return false;
  }

  bucket.count += 1;
  return true;
}
