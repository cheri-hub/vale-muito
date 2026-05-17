import { AuthForm } from "@/components/auth/AuthForm";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-md content-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">Conta</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-normal text-stone-950">Entrar no Vale Muito</h1>
        <p className="mt-4 leading-7 text-stone-600">
          Use login por link mágico para publicar recomendações e moderar quando sua conta for admin.
        </p>
      </section>
      {error ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Não foi possível concluir o login. Peça um novo link e tente novamente.
        </p>
      ) : null}
      <AuthForm />
    </main>
  );
}