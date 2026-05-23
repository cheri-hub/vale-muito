import { describe, expect, it } from "vitest";
import { buildDefaultProfile, parseProfileUpdateInput, type AuthUserForProfile } from "./profiles";

describe("buildDefaultProfile", () => {
  it("creates a member profile from auth metadata", () => {
    const profile = buildDefaultProfile(authUser({
      email: "bia@example.com",
      user_metadata: { full_name: "Bia Ramos", user_name: "bia.ramos" },
    }));

    expect(profile).toEqual({
      id: "12345678-1234-4234-9234-123456789abc",
      name: "Bia Ramos",
      handle: "@bia-ramos-12345678",
      role: "member",
    });
  });

  it("uses safe defaults when metadata is empty", () => {
    const profile = buildDefaultProfile(authUser({ email: "comida.boissima@example.com" }));

    expect(profile.name).toBe("Usuário Vale Muito");
    expect(profile.handle).toBe("@usuario-vale-muito-12345678");
  });

  it("uses safe defaults when the user has no email or metadata", () => {
    const profile = buildDefaultProfile(authUser({ email: undefined }));

    expect(profile.name).toBe("Usuário Vale Muito");
    expect(profile.handle).toBe("@usuario-vale-muito-12345678");
  });

  it("sanitizes misleading profile metadata", () => {
    const profile = buildDefaultProfile(authUser({
      user_metadata: { full_name: "<Admin Oficial>", user_name: "admin" },
    }));

    expect(profile.name).toBe("Usuário Vale Muito");
    expect(profile.handle).toBe("@usuario-12345678");
  });
});

describe("parseProfileUpdateInput", () => {
  it("normalizes a display name and handle", () => {
    expect(parseProfileUpdateInput({ name: "  Bia   Ramos  ", handle: "Bia Ramos" })).toEqual({
      name: "Bia Ramos",
      handle: "@bia-ramos",
    });
  });

  it("accepts handles already prefixed with at sign", () => {
    expect(parseProfileUpdateInput({ name: "Luis Miranda", handle: "@Luis.Miranda" })).toEqual({
      name: "Luis Miranda",
      handle: "@luis-miranda",
    });
  });

  it("rejects short names and reserved names", () => {
    expect(parseProfileUpdateInput({ name: "A", handle: "bia" })).toBeInstanceOf(Error);
    expect(parseProfileUpdateInput({ name: "Admin Oficial", handle: "bia" })).toBeInstanceOf(Error);
  });

  it("rejects invalid handles", () => {
    expect(parseProfileUpdateInput({ name: "Bia Ramos", handle: "a" })).toBeInstanceOf(Error);
    expect(parseProfileUpdateInput({ name: "Bia Ramos", handle: "admin" })).toBeInstanceOf(Error);
  });
});

function authUser(overrides: Partial<AuthUserForProfile>): AuthUserForProfile {
  return {
    id: "12345678-1234-4234-9234-123456789abc",
    email: overrides.email,
    user_metadata: overrides.user_metadata ?? {},
  };
}