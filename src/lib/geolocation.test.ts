import { describe, expect, it } from "vitest";
import { calculateDistanceInKm, isValidCoordinate } from "./geolocation";

describe("geolocation helpers", () => {
  it("validates latitude and longitude ranges", () => {
    expect(isValidCoordinate({ latitude: -23.5656, longitude: -46.6864 })).toBe(true);
    expect(isValidCoordinate({ latitude: 91, longitude: -46.6864 })).toBe(false);
    expect(isValidCoordinate({ latitude: -23.5656, longitude: -181 })).toBe(false);
    expect(isValidCoordinate({ latitude: Number.NaN, longitude: -46.6864 })).toBe(false);
    expect(isValidCoordinate({ latitude: -23.5656, longitude: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it("calculates zero distance for the same point", () => {
    const point = { latitude: -23.5656, longitude: -46.6864 };

    expect(calculateDistanceInKm(point, point)).toBe(0);
  });

  it("rejects invalid coordinates when calculating distance", () => {
    expect(() =>
      calculateDistanceInKm(
        { latitude: -23.5656, longitude: -46.6864 },
        { latitude: 200, longitude: -46.6864 },
      ),
    ).toThrow("Invalid coordinates.");
  });
});