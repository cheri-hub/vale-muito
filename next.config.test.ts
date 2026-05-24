import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig, { getSupabaseImageRemotePatterns } from "./next.config";

describe("next image configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows public Supabase recommendation photos", () => {
    const remotePatterns = getSupabaseImageRemotePatterns("https://sawbyjtmoltbldkxotkq.supabase.co");

    expect(remotePatterns).toEqual(
      [
        {
          hostname: "sawbyjtmoltbldkxotkq.supabase.co",
          pathname: "/storage/v1/object/public/recommendation-photos/**",
          protocol: "https",
        },
      ],
    );
  });

  it("keeps the seed image host configured", () => {
    expect(nextConfig.images?.remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hostname: "images.unsplash.com",
          protocol: "https",
        }),
      ]),
    );
  });

  it("ignores invalid or non-HTTPS Supabase URLs", () => {
    expect(getSupabaseImageRemotePatterns("not-a-url")).toEqual([]);
    expect(getSupabaseImageRemotePatterns("http://sawbyjtmoltbldkxotkq.supabase.co")).toEqual([]);
  });

  it("falls back to the production Supabase project during image builds", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    expect(getSupabaseImageRemotePatterns()).toEqual(
      [
        {
          hostname: "sawbyjtmoltbldkxotkq.supabase.co",
          pathname: "/storage/v1/object/public/recommendation-photos/**",
          protocol: "https",
        },
      ],
    );
  });
});