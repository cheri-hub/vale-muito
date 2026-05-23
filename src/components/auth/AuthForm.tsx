"use client";

import { useState, useTransition } from "react";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { sendLoginEmailOtpAction, sendLoginSmsOtpAction, verifyLoginSmsOtpAction } from "@/app/login/actions";

export function AuthForm() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"sms" | "email">("email");
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [isCodeStep, setIsCodeStep] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetPhoneStep() {
    setCode("");
    setIsCodeStep(false);
    setMessage(null);
    setVerifiedPhone("");
  }

  function setMode(nextMode: "sms" | "email") {
    setAuthMode(nextMode);
    setCode("");
    setIsCodeStep(false);
    setMessage(null);
    setVerifiedPhone("");
  }

  return (
    <form
      className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();

        startTransition(async () => {
          try {
            if (authMode === "email") {
              const result = await sendLoginEmailOtpAction(email);

              setMessage(result.message);
              return;
            }

            if (!isCodeStep) {
              const result = await sendLoginSmsOtpAction(phone);

              if (!result.ok || !result.data) {
                setMessage(result.message);
                return;
              }

              setVerifiedPhone(result.data.phone);
              setIsCodeStep(true);
              setMessage(result.message);
              return;
            }

            const profileResult = await verifyLoginSmsOtpAction(verifiedPhone, code);

            if (!profileResult.ok) {
              setMessage(profileResult.message);
              return;
            }

            router.push("/");
            router.refresh();
          } catch (error) {
            console.error("[AuthForm] Login action failed:", error);
            setMessage("Ocorreu um erro inesperado. Tente novamente.");
          }
        });
      }}
    >
      <div className="grid grid-cols-2 rounded-md border border-stone-200 bg-stone-50 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode("email")}
          className={`h-10 rounded-sm transition ${authMode === "email" ? "bg-white text-emerald-800 shadow-sm" : "text-stone-600"}`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMode("sms")}
          className={`h-10 rounded-sm transition ${authMode === "sms" ? "bg-white text-emerald-800 shadow-sm" : "text-stone-600"}`}
        >
          SMS
        </button>
      </div>
      {authMode === "sms" ? (
        <>
          <label className="space-y-1 text-sm font-medium text-stone-700">
            Telefone
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+5511999990000"
              className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              disabled={isCodeStep || isPending}
              inputMode="tel"
              required
            />
          </label>
          {isCodeStep ? (
            <label className="space-y-1 text-sm font-medium text-stone-700">
              Código SMS
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                inputMode="numeric"
                autoComplete="one-time-code"
                minLength={6}
                maxLength={8}
                required
              />
            </label>
          ) : null}
        </>
      ) : (
        <label className="space-y-1 text-sm font-medium text-stone-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@email.com"
            className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            disabled={isPending}
            required
          />
        </label>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        <LogIn aria-hidden="true" size={17} />
        {isPending ? "Aguarde..." : authMode === "email" ? "Enviar link" : isCodeStep ? "Verificar código" : "Enviar código"}
      </button>
      {authMode === "sms" && isCodeStep ? (
        <button
          type="button"
          onClick={resetPhoneStep}
          disabled={isPending}
          className="text-sm font-medium text-emerald-800 underline-offset-4 hover:underline disabled:text-stone-400"
        >
          Usar outro telefone
        </button>
      ) : null}
      {message ? <p className="rounded-md bg-stone-50 p-3 text-sm text-stone-700">{message}</p> : null}
    </form>
  );
}