import { describe, expect, it } from "vitest";
import { seedRecommendations } from "@/data/seed";
import type { UserProfile } from "@/domain/recommendations";
import { canModerate, canSubmitRecommendation, isOwnRecommendation } from "./permissions";

const admin: UserProfile = { id: "admin", name: "Admin", handle: "@admin", role: "admin" };
const member: UserProfile = { id: "user-bia", name: "Bia", handle: "@bia", role: "member" };

describe("permission helpers", () => {
  it("allows only admins to moderate", () => {
    expect(canModerate(admin)).toBe(true);
    expect(canModerate(member)).toBe(false);
    expect(canModerate(null)).toBe(false);
  });

  it("requires any logged user to submit", () => {
    expect(canSubmitRecommendation(member)).toBe(true);
    expect(canSubmitRecommendation(null)).toBe(false);
  });

  it("detects recommendation ownership", () => {
    expect(isOwnRecommendation(member, seedRecommendations[0])).toBe(true);
    expect(isOwnRecommendation(admin, seedRecommendations[0])).toBe(false);
  });
});