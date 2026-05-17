interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RedisRestConfig {
  token: string;
  url: string;
}

interface RedisCommandResult<T> {
  error?: string;
  result?: T;
}

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 10_000;
let lastCleanupAt = 0;

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export async function checkRateLimit(options: RateLimitOptions): Promise<boolean> {
  let redisConfig: RedisRestConfig | null;

  try {
    redisConfig = getRedisRestConfig();
  } catch {
    return false;
  }

  if (redisConfig) {
    try {
      return await checkRedisRateLimit(options, redisConfig);
    } catch {
      return shouldUseMemoryFallbackOnRedisError() ? checkMemoryRateLimit(options) : false;
    }
  }

  return checkMemoryRateLimit(options);
}

async function checkRedisRateLimit({ key, limit, windowMs }: RateLimitOptions, config: RedisRestConfig): Promise<boolean> {
  const bucketKey = createRedisBucketKey(key, windowMs, Date.now());
  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", bucketKey],
      ["PEXPIRE", bucketKey, String(windowMs)],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    return false;
  }

  const results = (await response.json()) as [RedisCommandResult<number | string>, RedisCommandResult<string | number>];
  const countResult = results[0];
  const expireResult = results[1];

  if (countResult?.error || expireResult?.error || expireResult?.result === 0) {
    return false;
  }

  const count = Number(countResult?.result);

  return Number.isFinite(count) && count <= limit;
}

function checkMemoryRateLimit({ key, limit, windowMs }: RateLimitOptions): boolean {
  const now = Date.now();
  cleanupExpiredBuckets(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      removeOldestBucket();
    }

    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  buckets.set(key, { ...bucket, count: bucket.count + 1 });
  return true;
}

function getRedisRestConfig(env = process.env): RedisRestConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL ?? env.REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN ?? env.REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Redis REST rate limit URL must use HTTPS.");
  }

  return {
    token,
    url: url.replace(/\/+$/, ""),
  };
}

function createRedisBucketKey(key: string, windowMs: number, now: number): string {
  const windowId = Math.floor(now / windowMs);
  const normalizedKey = key.replace(/[^a-zA-Z0-9:._-]/g, "_").slice(0, 200);

  return `rate-limit:${normalizedKey}:${windowId}`;
}

function cleanupExpiredBuckets(now: number): void {
  if (now - lastCleanupAt < 60_000) {
    return;
  }

  lastCleanupAt = now;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function removeOldestBucket(): void {
  const oldestKey = buckets.keys().next().value;

  if (oldestKey) {
    buckets.delete(oldestKey);
  }
}

function shouldUseMemoryFallbackOnRedisError(env = process.env): boolean {
  return env.RATE_LIMIT_REDIS_FAILURE_MODE === "memory";
}