import { isIP } from "node:net";

interface HeaderReader {
  get(name: string): string | null;
}

export function getRateLimitClientKey(headers: HeaderReader, env: Partial<NodeJS.ProcessEnv> = process.env): string {
  if (env.RATE_LIMIT_TRUST_PROXY_HEADERS !== "true") {
    return "local";
  }

  return (
    getFirstForwardedIp(headers.get("x-forwarded-for")) ??
    getValidIp(headers.get("x-real-ip")) ??
    getValidIp(headers.get("cf-connecting-ip")) ??
    "unknown"
  );
}

function getFirstForwardedIp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value
    .split(",")
    .map((candidate) => getValidIp(candidate))
    .find((candidate): candidate is string => candidate !== null) ?? null;
}

function getValidIp(value: string | null): string | null {
  const candidate = value?.trim();

  if (!candidate || isIP(candidate) === 0) {
    return null;
  }

  return candidate;
}
