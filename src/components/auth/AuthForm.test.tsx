/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/app/login/actions", () => ({
  sendLoginEmailOtpAction: vi.fn(),
  sendLoginSmsOtpAction: vi.fn(),
  verifyLoginSmsOtpAction: vi.fn(),
}));

import * as loginActions from "@/app/login/actions";
import { AuthForm } from "./AuthForm";

describe("AuthForm", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(loginActions.sendLoginEmailOtpAction).mockResolvedValue({
      ok: true,
      message: "Enviamos um link de acesso para seu email.",
      mode: "supabase",
    });
    vi.mocked(loginActions.sendLoginSmsOtpAction).mockResolvedValue({
      ok: true,
      data: { phone: "+5511999990000" },
      message: "Enviamos um código por SMS.",
      mode: "supabase",
    });
    vi.mocked(loginActions.verifyLoginSmsOtpAction).mockResolvedValue({
      ok: true,
      data: {
        id: "user-1",
        name: "Usuário Vale Muito",
        handle: "@usuario-vale-muito",
        role: "member",
      },
      message: "Login confirmado.",
      mode: "supabase",
    });
  });

  it("sends an SMS OTP to the normalized phone number", async () => {
    render(<AuthForm />);

    fireEvent.click(screen.getByRole("button", { name: /sms/i }));
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "+55 11 99999-0000" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    await waitFor(() => {
      expect(loginActions.sendLoginSmsOtpAction).toHaveBeenCalledWith("+55 11 99999-0000");
    });
    expect(await screen.findByLabelText("Código SMS")).toBeInTheDocument();
    expect(screen.getByText("Enviamos um código por SMS."));
  });

  it("shows server validation errors without opening the code step", async () => {
    vi.mocked(loginActions.sendLoginSmsOtpAction).mockResolvedValue({
      ok: false,
      message: "Use o formato internacional, como +5511999990000.",
      mode: "supabase",
    });
    render(<AuthForm />);

    fireEvent.click(screen.getByRole("button", { name: /sms/i }));
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "11999990000" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    expect(await screen.findByText("Use o formato internacional, como +5511999990000."));
    expect(screen.queryByLabelText("Código SMS")).not.toBeInTheDocument();
  });

  it("verifies the SMS code, ensures the profile, and redirects home", async () => {
    render(<AuthForm />);

    fireEvent.click(screen.getByRole("button", { name: /sms/i }));
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "+5511999990000" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));
    fireEvent.change(await screen.findByLabelText("Código SMS"), { target: { value: "123 456" } });
    fireEvent.click(screen.getByRole("button", { name: /verificar código/i }));

    await waitFor(() => {
      expect(loginActions.verifyLoginSmsOtpAction).toHaveBeenCalledWith("+5511999990000", "123 456");
    });
    expect(pushMock).toHaveBeenCalledWith("/");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows verification errors without redirecting", async () => {
    vi.mocked(loginActions.verifyLoginSmsOtpAction).mockResolvedValue({
      ok: false,
      message: "Código inválido ou expirado. Peça um novo código e tente novamente.",
      mode: "supabase",
    });
    render(<AuthForm />);

    fireEvent.click(screen.getByRole("button", { name: /sms/i }));
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "+5511999990000" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));
    fireEvent.change(await screen.findByLabelText("Código SMS"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verificar código/i }));

    expect(await screen.findByText("Código inválido ou expirado. Peça um novo código e tente novamente."));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("keeps email magic link as a fallback login option", async () => {
    render(<AuthForm />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bia@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar link/i }));

    await waitFor(() => {
      expect(loginActions.sendLoginEmailOtpAction).toHaveBeenCalledWith("bia@example.com");
    });
    expect(await screen.findByText("Enviamos um link de acesso para seu email."));
  });
});