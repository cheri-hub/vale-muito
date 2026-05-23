"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { updateProfileAction } from "@/app/profile/actions";
import type { UserProfile } from "@/domain/recommendations";

interface ProfileFormProps {
  profile: UserProfile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await updateProfileAction(formData);
          setMessage(result.message);

          if (result.ok && result.data) {
            setName(result.data.name);
            setHandle(result.data.handle);
            router.refresh();
          }
        });
      }}
    >
      <div>
        <p className="text-sm font-semibold text-emerald-700">Perfil</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-stone-950">Seu nome no Vale Muito</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-stone-700">
          Nome
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            maxLength={80}
            minLength={2}
            required
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-stone-700">
          Username
          <input
            name="handle"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            maxLength={25}
            minLength={3}
            placeholder="@seu-username"
            required
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save aria-hidden="true" size={16} />
          {isPending ? "Salvando..." : "Salvar perfil"}
        </button>
        {message ? <p className="text-sm font-medium text-stone-600">{message}</p> : null}
      </div>
    </form>
  );
}