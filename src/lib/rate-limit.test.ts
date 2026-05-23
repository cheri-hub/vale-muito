import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the local memory limiter when Redis REST env vars are absent", async () => {
    const key = `memory:${crypto.randomUUID()}`;

    await expect(checkRateLimit({ key, limit: 2, windowMs: 60_000 })).resolves.toBe(true);
    await expect(checkRateLimit({ key, limit: 2, windowMs: 60_000 })).resolves.toBe(true);
    await expect(checkRateLimit({ key, limit: 2, windowMs: 60_000 })).resolves.toBe(false);
  });

  it("uses Upstash Redis REST when configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token");

    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 1 }],
    } as Response);
    vi.stubGlobal("fetch", fetcher);

    await expect(checkRateLimit({ key: "create:127.0.0.1", limit: 8, windowMs: 60_000 })).resolves.toBe(true);

    expect(fetcher).toHaveBeenCalledWith(
      "https://redis.example.com/pipeline",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
        method: "POST",
      }),
    );
    expect(JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string)[0][0]).toBe("EVAL");
  });

  it("supports Vercel KV REST env var names", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.example.com");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");

    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 6 }],
    } as Response);
    vi.stubGlobal("fetch", fetcher);

    await expect(checkRateLimit({ key: "report:127.0.0.1", limit: 5, windowMs: 60_000 })).resolves.toBe(false);
    expect(fetcher).toHaveBeenCalledWith("https://kv.example.com/pipeline", expect.any(Object));
  });

  it("fails closed when configured Redis REST is unavailable", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => [] } as Response));

    await expect(checkRateLimit({ key: `redis-down:${crypto.randomUUID()}`, limit: 8, windowMs: 60_000 })).resolves.toBe(false);
  });

  it("fails closed when the configured Redis REST URL is not HTTPS", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token");

    await expect(checkRateLimit({ key: `redis-http:${crypto.randomUUID()}`, limit: 8, windowMs: 60_000 })).resolves.toBe(false);
  });

  it("fails closed when Redis REST throws by default", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(checkRateLimit({ key: `redis-error:${crypto.randomUUID()}`, limit: 8, windowMs: 60_000 })).resolves.toBe(false);
  });

  it("can fall back to memory when Redis REST throws and fallback mode is enabled", async () => {
    const key = `redis-memory-fallback:${crypto.randomUUID()}`;
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token");
    vi.stubEnv("RATE_LIMIT_REDIS_FAILURE_MODE", "memory");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(checkRateLimit({ key, limit: 1, windowMs: 60_000 })).resolves.toBe(true);
    await expect(checkRateLimit({ key, limit: 1, windowMs: 60_000 })).resolves.toBe(false);
  });

  it("denies requests when Redis eval returns an error", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ error: "ERR eval failed" }],
    } as Response));

    await expect(checkRateLimit({ key: `redis-eval:${crypto.randomUUID()}`, limit: 8, windowMs: 60_000 })).resolves.toBe(false);
  });
});
