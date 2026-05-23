import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { canModerate } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function AdminNavLink() {
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>>;

  try {
    currentUser = await getCurrentUser();
  } catch (error: unknown) {
    console.error("[AdminNavLink] Failed to resolve current user:", error);
    return null;
  }

  if (currentUser.mode === "offline" || canModerate(currentUser.profile)) {
    return (
      <Link
        href="/admin/moderation"
        className="hidden h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 sm:inline-flex"
      >
        <ShieldCheck aria-hidden="true" size={16} />
        Admin
      </Link>
    );
  }

  return null;
}
