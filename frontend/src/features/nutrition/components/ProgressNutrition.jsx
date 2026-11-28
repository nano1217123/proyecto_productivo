"use client";

import Link from "next/link";
import { useNutritionData } from "../hooks/useNutritionData";
import { grams } from "./labels";

export default function ProgressNutrition() {
  const { data: profile } = useNutritionData("perfil", {}, 0);
  const { data: summary } = useNutritionData(profile?.settings ? "registros" : null, { day: profile?.today }, 0);
  const protein = summary?.days[0]?.protein;
  return <section className="mt-6 rounded-2xl border border-[#30332f] bg-[#1c1e1b] p-5">
    <h2 className="text-2xl font-bold">Mi nutrición</h2>
    {summary && <p className="my-2 text-[#a9afa7]">{protein == null ? "Hoy todavía no hay registros." : `${grams(protein)} de proteína registrada hoy`}</p>}
    <Link href="/dashboard/nutricion" className="mt-2 inline-flex min-h-[44px] items-center font-bold text-[#d7adff]">Abrir mi nutrición →</Link>
  </section>;
}
