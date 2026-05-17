"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
}

export function ShareButton({ title }: ShareButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;

        if (navigator.share) {
          await navigator.share({ title, url });
          return;
        }

        await navigator.clipboard.writeText(url);
        setMessage("Link copiado");
      }}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
      aria-label={message ?? "Compartilhar recomendação"}
    >
      <Share2 aria-hidden="true" size={16} />
      {message ?? "Compartilhar"}
    </button>
  );
}