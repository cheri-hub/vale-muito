import type { ModerationStatus } from "@/domain/recommendations";

export const AUTO_HIDE_REPORT_THRESHOLD = 3;

export function shouldAutoHide(reportCount: number): boolean {
  return reportCount >= AUTO_HIDE_REPORT_THRESHOLD;
}

export function getNextModerationStatus(
  currentStatus: ModerationStatus,
  reportCount: number,
): ModerationStatus {
  if (currentStatus === "hidden") {
    return "hidden";
  }

  if (shouldAutoHide(reportCount)) {
    return "hidden";
  }

  if (reportCount > 0) {
    return "reported";
  }

  return "active";
}