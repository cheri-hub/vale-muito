import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import { Lightbulb, LogIn, MapPin, Sparkles, UserRound } from "lucide-react";
import { AdminNavLink } from "@/components/admin/AdminNavLink";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { parseTheme, themeCookieName } from "@/components/theme/theme";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vale Muito",
  description:
    "Recomendações de comidas em Piracicaba/SP que valem o gasto, com busca, filtros e curadoria da comunidade.",
  applicationName: "Vale Muito",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Vale Muito",
    description: "Comidas de Piracicaba/SP que valem cada real.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialTheme = parseTheme(cookieStore.get(themeCookieName)?.value) ?? "light";

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${initialTheme === "dark" ? "dark" : ""}`}
      style={{ colorScheme: initialTheme }}
    >
      <body className="min-h-full bg-stone-50 text-stone-950 dark:bg-stone-950 dark:text-stone-50">
        <ThemeProvider initialTheme={initialTheme}>
          <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/92 backdrop-blur dark:border-stone-800/80 dark:bg-stone-950/88">
            <nav className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm dark:bg-emerald-500 dark:text-stone-950">
                  <Sparkles aria-hidden="true" size={20} />
                </span>
                <span className="leading-tight">
                  <span className="block text-lg font-semibold tracking-normal">Vale Muito</span>
                  <span className="block text-xs font-medium text-stone-500 dark:text-stone-400">Comidas que compensam</span>
                </span>
              </Link>
              <div className="flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <Link
                  href="/"
                  className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  <MapPin aria-hidden="true" size={16} />
                  <span className="hidden sm:inline">Descobrir</span>
                </Link>
                <Link
                  href="/recommend/new"
                  className="inline-flex h-9 items-center rounded-full bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800 dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400"
                >
                  Recomendar
                </Link>
                <Link
                  href="/guidelines"
                  className="hidden h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 sm:inline-flex dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  <Lightbulb aria-hidden="true" size={16} />
                  Critérios
                </Link>
                <AdminNavLink />
                <Link
                  href="/login"
                  className="hidden h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 md:inline-flex dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  <LogIn aria-hidden="true" size={16} />
                  Entrar
                </Link>
                <Link
                  href="/profile"
                  className="hidden h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 md:inline-flex dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  <UserRound aria-hidden="true" size={16} />
                  Perfil
                </Link>
                <ThemeToggle />
              </div>
            </nav>
          </header>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
