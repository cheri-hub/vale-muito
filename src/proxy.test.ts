import { describe, expect, it } from "vitest";
import { createContentSecurityPolicy, getSupabaseContentSources } from "./proxy";

describe("content security policy", () => {
  it("allows public Supabase Storage images", () => {
    const csp = createContentSecurityPolicy("test-nonce", false, "https://sawbyjtmoltbldkxotkq.supabase.co");

    expect(csp).toContain("img-src");
    expect(csp).toContain("https://sawbyjtmoltbldkxotkq.supabase.co");
    expect(csp).not.toContain("https://*.supabase.co");
    expect(csp).not.toContain("https://*.supabase.in");
  });

  it("keeps nonce and development mode behavior", () => {
    const productionCsp = createContentSecurityPolicy("test-nonce", false, "https://sawbyjtmoltbldkxotkq.supabase.co");
    const developmentCsp = createContentSecurityPolicy("test-nonce", true, "https://sawbyjtmoltbldkxotkq.supabase.co");

    expect(productionCsp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(productionCsp).not.toContain("'unsafe-eval'");
    expect(developmentCsp).toContain("'unsafe-eval'");
  });

  it("derives Supabase sources from the configured project URL", () => {
    expect(getSupabaseContentSources("https://sawbyjtmoltbldkxotkq.supabase.co")).toEqual([
      "https://sawbyjtmoltbldkxotkq.supabase.co",
    ]);
  });

  it("ignores invalid or non-HTTPS Supabase URLs", () => {
    expect(getSupabaseContentSources("not-a-url")).toEqual([]);
    expect(getSupabaseContentSources("http://sawbyjtmoltbldkxotkq.supabase.co")).toEqual([]);
  });
});