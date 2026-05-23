/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/app/profile/actions", () => ({
  updateProfileAction: vi.fn(),
}));

import * as profileActions from "@/app/profile/actions";
import { ProfileForm } from "./ProfileForm";

describe("ProfileForm", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(profileActions.updateProfileAction).mockResolvedValue({
      ok: true,
      data: {
        id: "user-1",
        name: "Bia Ramos",
        handle: "@bia",
        role: "member",
      },
      message: "Perfil atualizado.",
      mode: "supabase",
    });
  });

  it("renders the current profile values", () => {
    render(<ProfileForm profile={{ id: "user-1", name: "Bia Ramos", handle: "@bia", role: "member" }} />);

    expect(screen.getByLabelText("Nome")).toHaveValue("Bia Ramos");
    expect(screen.getByLabelText("Username")).toHaveValue("@bia");
  });

  it("updates the profile and refreshes the route", async () => {
    vi.mocked(profileActions.updateProfileAction).mockResolvedValue({
      ok: true,
      data: {
        id: "user-1",
        name: "Bia Silva",
        handle: "@bia-silva",
        role: "member",
      },
      message: "Perfil atualizado.",
      mode: "supabase",
    });
    render(<ProfileForm profile={{ id: "user-1", name: "Bia Ramos", handle: "@bia", role: "member" }} />);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Bia Silva" } });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "Bia Silva" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar perfil/i }));

    await waitFor(() => {
      expect(profileActions.updateProfileAction).toHaveBeenCalledWith(expect.any(FormData));
    });

    await waitFor(() => {
      expect(screen.getByText("Perfil atualizado.")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Nome")).toHaveValue("Bia Silva");
    expect(screen.getByLabelText("Username")).toHaveValue("@bia-silva");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows errors returned by the server action", async () => {
    vi.mocked(profileActions.updateProfileAction).mockResolvedValue({
      ok: false,
      message: "Esse username já está em uso.",
      mode: "supabase",
    });
    render(<ProfileForm profile={{ id: "user-1", name: "Bia Ramos", handle: "@bia", role: "member" }} />);

    fireEvent.click(screen.getByRole("button", { name: /salvar perfil/i }));

    expect(await screen.findByText("Esse username já está em uso.")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});