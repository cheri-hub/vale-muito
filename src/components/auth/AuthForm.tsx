"use client";

import { useState, useTransition } from "react";
import { LogIn } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SupabasePublicEnv } from "@/lib/supabase/env";

interface AuthFormProps {
  supabaseEnv: SupabasePublicEnv | null;
}

export function AuthForm({ supabaseEnv }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const supabase = createBrowserSupabaseClient(supabaseEnv);

        if (!supabase) {
          setMessage("Modo local ativo. Configure as env vars do Supabase para habilitar login.");
          return;
        }

        startTransition(async () => {
          const origin = window.location.origin;
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${origin}/auth/callback` },
          });

          setMessage(error ? error.message : "Enviamos um link de acesso para seu email.");
        });
      }}
    >
      <label className="space-y-1 text-sm font-medium text-stone-700">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@email.com"
          className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          required
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        <LogIn aria-hidden="true" size={17} />
        {isPending ? "Enviando..." : "Entrar com link"}
      </button>
      {message ? <p className="rounded-md bg-stone-50 p-3 text-sm text-stone-700">{message}</p> : null}
    </form>
  );
}