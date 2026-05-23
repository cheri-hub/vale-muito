"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { UserProfile } from "@/domain/recommendations";
import { ensureBasicProfile } from "@/lib/auth/profiles";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitClientKey } from "@/lib/rate-limit-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/repositories/recommendations/recommendations-repository";

const internationalPhonePattern = /^\+[1-9]\d{7,14}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const smsCodePattern = /^\d{6,8}$/;

export async function sendLoginEmailOtpAction(email: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const mode = supabase ? "supabase" : "offline";
  const normalizedEmail = normalizeEmailInput(email);

  if (!isEmailAddress(normalizedEmail)) {
    return { ok: false, message: "Informe um email válido.", mode };
  }

  if (!supabase) {
    return {
      ok: false,
      message: "Modo local ativo. Configure as env vars do Supabase para habilitar login.",
      mode,
    };
  }

  if (!(await isLoginActionAllowed("email-send", 5, 60 * 1000)) || !(await isEmailOtpAllowed(normalizedEmail))) {
    return {
      ok: false,
      message: "Muitas tentativas de login por email. Aguarde um pouco antes de pedir outro link.",
      mode,
    };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: `${await getPublicOrigin()}/auth/callback` },
    });

    if (error) {
      return { ok: false, message: getEmailLoginMessage(error.message, error.status), mode };
    }
  } catch (error) {
    console.error("[LoginAction] Failed to send email OTP:", error);

    return { ok: false, message: "Não foi possível enviar o link de acesso agora.", mode };
  }

  return { ok: true, message: "Enviamos um link de acesso para seu email.", mode };
}

export async function sendLoginSmsOtpAction(phone: string): Promise<ActionResult<{ phone: string }>> {
  const supabase = await createServerSupabaseClient();
  const mode = supabase ? "supabase" : "offline";
  const normalizedPhone = normalizePhoneInput(phone);

  if (!isInternationalPhone(normalizedPhone)) {
    return { ok: false, message: "Use o formato internacional, como +5511999990000.", mode };
  }

  if (!supabase) {
    return {
      ok: false,
      message: "Modo local ativo. Configure as env vars do Supabase para habilitar login.",
      mode,
    };
  }

  if (!(await isLoginActionAllowed("sms-send", 5, 60 * 1000)) || !(await isPhoneOtpAllowed(normalizedPhone))) {
    return {
      ok: false,
      message: "Muitas tentativas de login por SMS. Aguarde um pouco antes de pedir outro código.",
      mode,
    };
  }

  let sendResult: Awaited<ReturnType<typeof supabase.auth.signInWithOtp>>;

  try {
    sendResult = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
  } catch (error) {
    console.error("[LoginAction] Failed to send SMS OTP:", error);

    return { ok: false, message: "Não foi possível enviar o código de acesso agora.", mode };
  }

  if (sendResult.error) {
    return { ok: false, message: getOtpSendMessage(sendResult.error.message, sendResult.error.status), mode };
  }

  return { ok: true, data: { phone: normalizedPhone }, message: "Enviamos um código por SMS.", mode };
}

export async function verifyLoginSmsOtpAction(phone: string, code: string): Promise<ActionResult<UserProfile>> {
  const supabase = await createServerSupabaseClient();
  const mode = supabase ? "supabase" : "offline";
  const normalizedPhone = normalizePhoneInput(phone);
  const normalizedCode = normalizeOtpCode(code);

  if (!isInternationalPhone(normalizedPhone) || !smsCodePattern.test(normalizedCode)) {
    return { ok: false, message: "Código inválido ou expirado. Peça um novo código e tente novamente.", mode };
  }

  if (!supabase) {
    return {
      ok: false,
      message: "Modo local ativo. Configure as env vars do Supabase para habilitar login.",
      mode,
    };
  }

  if (!(await isLoginActionAllowed("sms-verify", 10, 10 * 60 * 1000))) {
    return {
      ok: false,
      message: "Muitas tentativas de verificação. Aguarde um pouco antes de tentar novamente.",
      mode,
    };
  }

  let verifyResult: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>;

  try {
    verifyResult = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: normalizedCode,
      type: "sms",
    });
  } catch (error) {
    console.error("[LoginAction] Failed to verify SMS OTP:", error);

    return { ok: false, message: "Não foi possível verificar o código agora.", mode };
  }

  const { data: authData, error } = verifyResult;

  if (error || !authData.user) {
    return { ok: false, message: getOtpVerifyMessage(error?.message, error?.status), mode };
  }

  return ensureProfileForUser(supabase, authData.user);
}

export async function ensureLoginProfileAction(): Promise<ActionResult<UserProfile>> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Modo local ativo. Configure as env vars do Supabase para habilitar login.",
      mode: "offline",
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return {
      ok: false,
      message: "Não foi possível confirmar seu login. Tente entrar novamente.",
      mode: "supabase",
    };
  }

  try {
    return await ensureProfileForUser(supabase, authData.user);
  } catch (error) {
    console.error("[LoginAction] Failed to ensure profile:", error);

    return {
      ok: false,
      message: "Seu login foi confirmado, mas não foi possível preparar o perfil agora.",
      mode: "supabase",
    };
  }
}

async function ensureProfileForUser(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  user: Parameters<typeof ensureBasicProfile>[1],
): Promise<ActionResult<UserProfile>> {
  try {
    const profile = await ensureBasicProfile(supabase, user);
    revalidatePath("/");
    revalidatePath("/profile");

    return {
      ok: true,
      data: profile,
      message: "Login confirmado.",
      mode: "supabase",
    };
  } catch (error) {
    console.error("[LoginAction] Failed to ensure profile:", error);

    return {
      ok: false,
      message: "Seu login foi confirmado, mas não foi possível preparar o perfil agora.",
      mode: "supabase",
    };
  }
}

function normalizePhoneInput(phone: string) {
  return phone.trim().replace(/[\s().-]/g, "");
}

function normalizeEmailInput(email: string) {
  return email.trim().toLowerCase();
}

function normalizeOtpCode(code: string) {
  return code.replace(/\D/g, "");
}

function isInternationalPhone(phone: string) {
  return internationalPhonePattern.test(phone);
}

function isEmailAddress(email: string) {
  return email.length <= 254 && emailPattern.test(email);
}

function getEmailLoginMessage(errorMessage?: string, errorStatus?: number) {
  if (errorStatus === 429 || /rate limit/i.test(errorMessage ?? "")) {
    return "Muitas tentativas de login por email. Aguarde um pouco antes de pedir outro link.";
  }

  return errorMessage ?? "Não foi possível enviar o link de acesso agora.";
}

function getOtpSendMessage(errorMessage?: string, errorStatus?: number) {
  if (errorStatus === 429 || /rate limit/i.test(errorMessage ?? "")) {
    return "Muitas tentativas de login por SMS. Aguarde um pouco antes de pedir outro código.";
  }

  return errorMessage ?? "Não foi possível enviar o código de acesso agora.";
}

function getOtpVerifyMessage(errorMessage?: string, errorStatus?: number) {
  if (errorStatus === 429 || /rate limit/i.test(errorMessage ?? "")) {
    return "Muitas tentativas de verificação. Aguarde um pouco antes de tentar novamente.";
  }

  if (/token|code|otp|expired|invalid/i.test(errorMessage ?? "")) {
    return "Código inválido ou expirado. Peça um novo código e tente novamente.";
  }

  return errorMessage ?? "Não foi possível verificar o código agora.";
}

async function isLoginActionAllowed(action: string, limit: number, windowMs: number): Promise<boolean> {
  const headerStore = await headers();
  const clientKey = getRateLimitClientKey(headerStore);

  return checkRateLimit({ key: `${action}:${clientKey}`, limit, windowMs });
}

async function isPhoneOtpAllowed(phone: string): Promise<boolean> {
  return checkRateLimit({
    key: `sms-phone:${hashRateLimitValue(phone)}`,
    limit: 3,
    windowMs: 60 * 1000,
  });
}

async function isEmailOtpAllowed(email: string): Promise<boolean> {
  return checkRateLimit({
    key: `email-address:${hashRateLimitValue(email)}`,
    limit: 3,
    windowMs: 60 * 1000,
  });
}

async function getPublicOrigin(): Promise<string> {
  const configuredOrigin = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL)?.trim().replace(/\/+$/, "");

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      return "http://localhost:3000";
    }
  }

  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = headerStore.get("host")?.split(",")[0]?.trim();
  const host = process.env.RATE_LIMIT_TRUST_PROXY_HEADERS === "true" ? (forwardedHost ?? requestHost) : requestHost;
  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = process.env.RATE_LIMIT_TRUST_PROXY_HEADERS === "true" ? (forwardedProto ?? "https") : "https";

  if (!host) {
    return "http://localhost:3000";
  }

  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return `http://${host}`;
  }

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function hashRateLimitValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}