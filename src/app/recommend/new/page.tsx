import { Lightbulb } from "lucide-react";
import { RecommendationFormMock } from "@/components/forms/RecommendationFormMock";
import { appEditorialRule, appOfficialRegion } from "@/lib/product";

export default function NewRecommendationPage() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Nova recomendação em {appOfficialRegion.label}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-stone-950">Só publique se você recomendaria pagar de novo.</h1>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">
            O Vale Muito não é para listar tudo que existe. É para registrar comidas que passaram no teste do bolso.
          </p>
        </div>
        <aside className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <div className="flex items-center gap-2 font-semibold">
            <Lightbulb aria-hidden="true" size={18} />
            Critério editorial
          </div>
          <p className="mt-2 text-sm leading-6">
            {appEditorialRule} Dê contexto: preço pago, tamanho da porção, sabor, ocasião e por que outra pessoa não se arrependeria.
          </p>
        </aside>
      </section>
      <RecommendationFormMock />
    </main>
  );
}