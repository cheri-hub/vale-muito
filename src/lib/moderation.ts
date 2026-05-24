import type { ModerationStatus } from "@/domain/recommendations";

export function getNextModerationStatus(
  currentStatus: ModerationStatus,
  reportCount: number,
): ModerationStatus {
  if (currentStatus === "hidden") {
    return "hidden";
  }

  if (reportCount > 0) {
    return "reported";
  }

  return "active";
}