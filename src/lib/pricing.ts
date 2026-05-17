import type { PriceBand } from "@/domain/recommendations";

export function calculatePriceBand(pricePaid: number): PriceBand {
  if (!Number.isFinite(pricePaid) || pricePaid <= 0) {
    throw new Error("Price must be greater than zero.");
  }

  if (pricePaid < 30) {
    return "ate-30";
  }

  if (pricePaid < 60) {
    return "30-60";
  }

  if (pricePaid <= 100) {
    return "60-100";
  }

  return "100-plus";
}