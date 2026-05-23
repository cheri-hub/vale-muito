import { describe, expect, it } from "vitest";
import { getRateLimitClientKey } from "./rate-limit-client";

function headers(values: Record<string, string | null>) {
  return {
    get: (name: string) => values[name.toLowerCase()] ?? null,
  };
}

describe("getRateLimitClientKey", () => {
  it("does not trust proxy headers unless explicitly enabled", () => {
    const headerStore = headers({ "x-forwarded-for": "203.0.113.10" });

    expect(getRateLimitClientKey(headerStore, {})).toBe("local");
  });

  it("uses the last valid forwarded IP when trusted proxy headers are enabled", () => {
    const headerStore = headers({ "x-forwarded-for": "203.0.113.10, 198.51.100.20" });

    expect(getRateLimitClientKey(headerStore, { RATE_LIMIT_TRUST_PROXY_HEADERS: "true" })).toBe("198.51.100.20");
  });

  it("prefers x-real-ip and falls back to Cloudflare headers", () => {
    expect(
      getRateLimitClientKey(
        headers({ "x-real-ip": "2001:db8::1", "x-forwarded-for": "203.0.113.10, 198.51.100.20" }),
        { RATE_LIMIT_TRUST_PROXY_HEADERS: "true" },
      ),
    ).toBe("2001:db8::1");
    expect(
      getRateLimitClientKey(headers({ "x-real-ip": "2001:db8::1" }), { RATE_LIMIT_TRUST_PROXY_HEADERS: "true" }),
    ).toBe("2001:db8::1");
    expect(
      getRateLimitClientKey(headers({ "cf-connecting-ip": "198.51.100.7" }), {
        RATE_LIMIT_TRUST_PROXY_HEADERS: "true",
      }),
    ).toBe("198.51.100.7");
  });

  it("rejects malformed trusted proxy header values", () => {
    const headerStore = headers({ "x-forwarded-for": "not-an-ip", "x-real-ip": "also-bad" });

    expect(getRateLimitClientKey(headerStore, { RATE_LIMIT_TRUST_PROXY_HEADERS: "true" })).toBe("unknown");
  });
});
