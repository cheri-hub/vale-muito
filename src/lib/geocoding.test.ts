import { describe, expect, it, vi } from "vitest";
import { geocodeAddress } from "./geocoding";

describe("geocodeAddress", () => {
  it("returns coordinates from the first geocoding result", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: "-22.7253", lon: "-47.6492" }],
    });

    await expect(geocodeAddress("Rua Governador Pedro de Toledo", "Piracicaba", fetcher)).resolves.toEqual({
      latitude: -22.7253,
      longitude: -47.6492,
    });
  });

  it("returns null for empty or failed searches", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, json: async () => [] });

    await expect(geocodeAddress("", "Piracicaba", fetcher)).resolves.toBeNull();
    await expect(geocodeAddress("Rua sem resultado", "Piracicaba", fetcher)).resolves.toBeNull();
  });
});