import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/domain/recommendations";

const { getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: getCurrentUserMock,
}));

import { AdminNavLink } from "./AdminNavLink";

const memberProfile: UserProfile = {
  id: "user-1",
  name: "Bia Ramos",
  handle: "@bia",
  role: "member",
};

const adminProfile: UserProfile = {
  ...memberProfile,
  id: "admin-1",
  name: "Admin Vale Muito",
  handle: "@admin-valemuito",
  role: "admin",
};

describe("AdminNavLink", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the admin link for admin users", async () => {
    getCurrentUserMock.mockResolvedValue({ profile: adminProfile, mode: "supabase" });

    await expect(AdminNavLink()).resolves.not.toBeNull();
  });

  it("does not render the admin link for member users", async () => {
    getCurrentUserMock.mockResolvedValue({ profile: memberProfile, mode: "supabase" });

    await expect(AdminNavLink()).resolves.toBeNull();
  });

  it("does not render the admin link for signed-out users", async () => {
    getCurrentUserMock.mockResolvedValue({ profile: null, mode: "supabase" });

    await expect(AdminNavLink()).resolves.toBeNull();
  });

  it("renders the admin link in offline demo mode", async () => {
    getCurrentUserMock.mockResolvedValue({ profile: null, mode: "offline" });

    await expect(AdminNavLink()).resolves.not.toBeNull();
  });

  it("does not render the admin link when the current user lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    getCurrentUserMock.mockRejectedValue(new Error("Supabase unavailable"));

    await expect(AdminNavLink()).resolves.toBeNull();
  });
});
