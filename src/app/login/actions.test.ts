import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { checkRateLimitMock, createServerSupabaseClientMock, ensureBasicProfileMock, headersMock, revalidatePathMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  ensureBasicProfileMock: vi.fn(),
  headersMock: vi.fn(),
  revalidatePathMock: vi.fn(),
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

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

vi.mock("@/lib/auth/profiles", () => ({
  ensureBasicProfile: ensureBasicProfileMock,
}));

import { ensureLoginProfileAction, sendLoginEmailOtpAction, sendLoginSmsOtpAction, verifyLoginSmsOtpAction } from "./actions";

describe("login actions", () => {
  const authUser = {
    id: "user-1",
    email: null,
    user_metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("RATE_LIMIT_TRUST_PROXY_HEADERS", "");

    headersMock.mockResolvedValue(new Headers());
    checkRateLimitMock.mockResolvedValue(true);
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
        signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
        verifyOtp: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
      },
    });
    ensureBasicProfileMock.mockResolvedValue({
      id: "user-1",
      name: "Usuário Vale Muito",
      handle: "@usuario-vale-muito",
      role: "member",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends an email magic link with server-side validation and rate limiting", async () => {
    await expect(sendLoginEmailOtpAction("BIA@EXAMPLE.COM")).resolves.toEqual({
      ok: true,
      message: "Enviamos um link de acesso para seu email.",
      mode: "supabase",
    });

    const supabase = await createServerSupabaseClientMock.mock.results[0].value;
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "bia@example.com",
      options: { emailRedirectTo: "http://localhost:3000/auth/callback" },
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith(expect.objectContaining({ key: "email-send:test-client" }));
    expect(checkRateLimitMock).toHaveBeenCalledWith(expect.objectContaining({ key: expect.stringMatching(/^email-address:/) }));
  });

  it("rejects invalid email before calling Supabase", async () => {
    await expect(sendLoginEmailOtpAction("bia")).resolves.toEqual({
      ok: false,
      message: "Informe um email válido.",
      mode: "supabase",
    });

    const supabase = await createServerSupabaseClientMock.mock.results[0].value;
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("blocks email magic links when rate limited", async () => {
    checkRateLimitMock.mockResolvedValueOnce(false);

    await expect(sendLoginEmailOtpAction("bia@example.com")).resolves.toEqual({
      ok: false,
      message: "Muitas tentativas de login por email. Aguarde um pouco antes de pedir outro link.",
      mode: "supabase",
    });
  });

  it("does not expose unexpected email provider errors", async () => {
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        signInWithOtp: vi.fn().mockResolvedValue({ error: { message: "internal provider stack trace", status: 500 } }),
      },
    });

    await expect(sendLoginEmailOtpAction("bia@example.com")).resolves.toEqual({
      ok: false,
      message: "Não foi possível enviar o link de acesso agora.",
      mode: "supabase",
    });
  });

  it("sends a SMS OTP with server-side validation and rate limiting", async () => {
    await expect(sendLoginSmsOtpAction("+55 11 99999-0000")).resolves.toEqual({
      ok: true,
      data: { phone: "+5511999990000" },
      message: "Enviamos um código por SMS.",
      mode: "supabase",
    });

    const supabase = await createServerSupabaseClientMock.mock.results[0].value;
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ phone: "+5511999990000" });
    expect(checkRateLimitMock).toHaveBeenCalledWith(expect.objectContaining({ key: "sms-send:test-client" }));
    expect(checkRateLimitMock).toHaveBeenCalledWith(expect.objectContaining({ key: expect.stringMatching(/^sms-phone:/) }));
  });

  it("rejects invalid SMS phone numbers before calling Supabase", async () => {
    await expect(sendLoginSmsOtpAction("11999990000")).resolves.toEqual({
      ok: false,
      message: "Use o formato internacional, como +5511999990000.",
      mode: "supabase",
    });

    const supabase = await createServerSupabaseClientMock.mock.results[0].value;
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("blocks SMS sends when rate limited", async () => {
    checkRateLimitMock.mockResolvedValueOnce(false);

    await expect(sendLoginSmsOtpAction("+5511999990000")).resolves.toEqual({
      ok: false,
      message: "Muitas tentativas de login por SMS. Aguarde um pouco antes de pedir outro código.",
      mode: "supabase",
    });
  });

  it("returns a friendly fallback message when the SMS provider is unsupported", async () => {
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        signInWithOtp: vi.fn().mockResolvedValue({ error: { message: "Unsupported phone provider", status: 400 } }),
      },
    });

    await expect(sendLoginSmsOtpAction("+5511999990000")).resolves.toEqual({
      ok: false,
      message: "SMS não está disponível agora. Use a aba Email para entrar.",
      mode: "supabase",
    });
  });

  it("does not expose unexpected SMS provider errors", async () => {
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        signInWithOtp: vi.fn().mockResolvedValue({ error: { message: "provider internal failure", status: 500 } }),
      },
    });

    await expect(sendLoginSmsOtpAction("+5511999990000")).resolves.toEqual({
      ok: false,
      message: "Não foi possível enviar o código de acesso agora.",
      mode: "supabase",
    });
  });

  it("verifies a SMS OTP and ensures the authenticated profile", async () => {
    await expect(verifyLoginSmsOtpAction("+5511999990000", "123 456")).resolves.toEqual({
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

    const supabase = await createServerSupabaseClientMock.mock.results[0].value;
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ phone: "+5511999990000", token: "123456", type: "sms" });
    expect(ensureBasicProfileMock).toHaveBeenCalledWith(supabase, authUser);
  });

  it("returns a friendly message for invalid or expired SMS codes", async () => {
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "Token has expired", status: 400 } }),
      },
    });

    await expect(verifyLoginSmsOtpAction("+5511999990000", "123456")).resolves.toEqual({
      ok: false,
      message: "Código inválido ou expirado. Peça um novo código e tente novamente.",
      mode: "supabase",
    });
    expect(ensureBasicProfileMock).not.toHaveBeenCalled();
  });

  it("does not expose unexpected SMS verification errors", async () => {
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "auth backend details", status: 500 } }),
      },
    });

    await expect(verifyLoginSmsOtpAction("+5511999990000", "123456")).resolves.toEqual({
      ok: false,
      message: "Não foi possível verificar o código agora.",
      mode: "supabase",
    });
  });

  it("ensures a profile for the authenticated user", async () => {
    await expect(ensureLoginProfileAction()).resolves.toEqual({
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

    expect(ensureBasicProfileMock).toHaveBeenCalledWith(expect.anything(), authUser);
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });

  it("rejects profile creation without an authenticated session", async () => {
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    await expect(ensureLoginProfileAction()).resolves.toEqual({
      ok: false,
      message: "Não foi possível confirmar seu login. Tente entrar novamente.",
      mode: "supabase",
    });
    expect(ensureBasicProfileMock).not.toHaveBeenCalled();
  });
});