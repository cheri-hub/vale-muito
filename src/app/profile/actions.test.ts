import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  checkRateLimitMock,
  createServerSupabaseClientMock,
  getCurrentUserMock,
  headersMock,
  revalidatePathMock,
  updateUserProfileMock,
} = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  headersMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  updateUserProfileMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/rate-limit-client", () => ({
  getRateLimitClientKey: vi.fn(() => "test-client"),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/auth/profiles", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/profiles")>("@/lib/auth/profiles");

  return {
    ...actual,
    updateUserProfile: updateUserProfileMock,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import { updateProfileAction } from "./actions";

describe("updateProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    headersMock.mockResolvedValue(new Headers());
    checkRateLimitMock.mockResolvedValue(true);
    createServerSupabaseClientMock.mockResolvedValue({});
    getCurrentUserMock.mockResolvedValue({
      profile: {
        id: "user-1",
        name: "Bia Ramos",
        handle: "@bia",
        role: "member",
      },
      mode: "supabase",
    });
    updateUserProfileMock.mockResolvedValue({
      id: "user-1",
      name: "Bia Ramos Silva",
      handle: "@bia-silva",
      role: "member",
    });
  });

  it("rejects unauthenticated profile updates", async () => {
    getCurrentUserMock.mockResolvedValue({ profile: null, mode: "supabase" });

    const formData = new FormData();
    formData.set("name", "Bia Ramos");
    formData.set("handle", "bia");

    await expect(updateProfileAction(formData)).resolves.toEqual({
      ok: false,
      message: "Faça login para editar seu perfil.",
      mode: "supabase",
    });
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it("blocks profile updates when rate limited", async () => {
    checkRateLimitMock.mockResolvedValue(false);

    const formData = new FormData();
    formData.set("name", "Bia Ramos");
    formData.set("handle", "bia");

    await expect(updateProfileAction(formData)).resolves.toEqual({
      ok: false,
      message: "Muitas edições de perfil em pouco tempo. Tente novamente mais tarde.",
      mode: "supabase",
    });
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it("returns validation errors without writing to Supabase", async () => {
    const formData = new FormData();
    formData.set("name", "A");
    formData.set("handle", "bia");

    await expect(updateProfileAction(formData)).resolves.toEqual({
      ok: false,
      message: "O nome deve ter entre 2 e 80 caracteres.",
      mode: "supabase",
    });
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it("updates the current user's profile", async () => {
    const formData = new FormData();
    formData.set("name", "Bia Ramos Silva");
    formData.set("handle", "Bia Silva");

    await expect(updateProfileAction(formData)).resolves.toEqual({
      ok: true,
      data: {
        id: "user-1",
        name: "Bia Ramos Silva",
        handle: "@bia-silva",
        role: "member",
      },
      message: "Perfil atualizado.",
      mode: "supabase",
    });
    expect(updateUserProfileMock).toHaveBeenCalledWith(expect.anything(), "user-1", {
      name: "Bia Ramos Silva",
      handle: "Bia Silva",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });
});