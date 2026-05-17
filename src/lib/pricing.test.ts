import { describe, expect, it } from "vitest";
import { calculatePriceBand } from "./pricing";

describe("calculatePriceBand", () => {
  it.each([
    [25, "ate-30"],
    [30, "30-60"],
    [45.5, "30-60"],
    [100, "60-100"],
    [150, "100-plus"],
  ])("maps %s to %s", (price, band) => {
    expect(calculatePriceBand(price)).toBe(band);
  });

  it("rejects zero or negative prices", () => {
    expect(() => calculatePriceBand(0)).toThrow("Price must be greater than zero.");
    expect(() => calculatePriceBand(-1)).toThrow("Price must be greater than zero.");
  });
});