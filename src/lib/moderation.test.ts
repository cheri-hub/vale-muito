import { describe, expect, it } from "vitest";
import { getNextModerationStatus } from "./moderation";

describe("moderation helpers", () => {
  it("marks reported recommendations for admin review without auto-hiding", () => {
    expect(getNextModerationStatus("active", 0)).toBe("active");
    expect(getNextModerationStatus("active", 1)).toBe("reported");
    expect(getNextModerationStatus("reported", 3)).toBe("reported");
    expect(getNextModerationStatus("hidden", 0)).toBe("hidden");
  });
});