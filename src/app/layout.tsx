import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Lightbulb, LogIn, MapPin, ShieldCheck, Sparkles, UserRound } from "lucide-react";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-stone-50 text-stone-950">
        <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/92 backdrop-blur">
          <nav className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
                <Sparkles aria-hidden="true" size={20} />
              </span>
              <span className="leading-tight">
                <span className="block text-lg font-semibold tracking-normal">Vale Muito</span>
                <span className="block text-xs font-medium text-stone-500">Comidas que compensam</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1 shadow-sm">
              <Link
                href="/"
                className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
              >
                <MapPin aria-hidden="true" size={16} />
                Descobrir
              </Link>
              <Link
                href="/recommend/new"
                className="inline-flex h-9 items-center rounded-full bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Recomendar
              </Link>
              <Link
                href="/guidelines"
                className="hidden h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 sm:inline-flex"
              >
                <Lightbulb aria-hidden="true" size={16} />
                Critérios
              </Link>
              <Link
                href="/admin/moderation"
                className="hidden h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 sm:inline-flex"
              >
                <ShieldCheck aria-hidden="true" size={16} />
                Admin
              </Link>
              <Link
                href="/login"
                className="hidden h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 md:inline-flex"
              >
                <LogIn aria-hidden="true" size={16} />
                Entrar
              </Link>
              <Link
                href="/profile"
                className="hidden h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-100 md:inline-flex"
              >
                <UserRound aria-hidden="true" size={16} />
                Perfil
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
