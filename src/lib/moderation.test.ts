import { describe, expect, it } from "vitest";
import { getNextModerationStatus, shouldAutoHide } from "./moderation";

describe("moderation helpers", () => {
  it("auto-hides at three reports", () => {
    expect(shouldAutoHide(2)).toBe(false);
    expect(shouldAutoHide(3)).toBe(true);
  });

  it("calculates next moderation status", () => {
    expect(getNextModerationStatus("active", 0)).toBe("active");
    expect(getNextModerationStatus("active", 1)).toBe("reported");
    expect(getNextModerationStatus("reported", 3)).toBe("hidden");
    expect(getNextModerationStatus("hidden", 0)).toBe("hidden");
  });
});