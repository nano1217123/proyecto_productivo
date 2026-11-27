function Block({ className = "", style = {} }) {
  return <span className={`block bg-white/10 rounded-lg animate-pulse ${className}`} style={style} />;
}

export function MemberDashboardSkeleton() {
  return (
    <main className="min-h-screen bg-[#171817] px-4 pb-16 sm:px-6" aria-busy="true" aria-label="Cargando panel">
      <div className="mx-auto max-w-[1060px]">
        <div className="flex min-h-[72px] items-center justify-between border-b border-[#30332f]">
          <Block className="h-5 w-28" />
          <Block className="h-5 w-24" />
        </div>
        <div className="py-7 sm:py-10">
          <Block className="mb-2 h-4 w-36" />
          <Block className="h-10 w-3/4 max-w-xs" />
          <div className="mt-5 grid gap-2 sm:grid-cols-3 sm:max-w-xl">
            {[0, 1, 2].map((i) => <Block key={i} className="h-11" />)}
          </div>
        </div>
        <Block className="mb-3 h-5 w-28" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Block key={i} className="h-24" />)}
        </div>
      </div>
    </main>
  );
}

export function ExerciseListSkeleton() {
  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817]" aria-busy="true" aria-label="Cargando grupos musculares">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Block className="w-[140px] h-[22px]" />
        <Block className="w-[100px] h-8 rounded-[8px]" />
      </header>
      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px]">
        <Block className="w-[90px] h-3 mb-3.5" />
        <Block className="w-[280px] h-9 mb-2" />
        <Block className="w-[80%] h-3.5" />
      </section>
      <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="min-h-[175px] p-5 border border-[#41433f] rounded-lg bg-[#212320]">
            <Block className="w-6 h-3 mb-3.5" />
            <Block className="w-[60%] h-[18px] mb-2" />
            <Block className="w-[40%] h-3" />
          </div>
        ))}
      </section>
    </main>
  );
}

export function ExerciseGroupSkeleton() {
  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817]" aria-busy="true" aria-label="Cargando ejercicios">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Block className="w-[140px] h-[22px]" />
        <Block className="w-[100px] h-8 rounded-[8px]" />
      </header>
      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px]">
        <Block className="w-[90px] h-3 mb-3.5" />
        <Block className="w-[280px] h-9 mb-2" />
        <Block className="w-[85%] h-3.5" />
      </section>
      <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="min-h-[150px] p-5 border border-[#41433f] rounded-lg bg-[#212320]">
            <Block className="w-6 h-3 mb-3.5" />
            <Block className="w-[70%] h-4 mb-2" />
            <Block className="w-[50%] h-3" />
          </div>
        ))}
      </section>
    </main>
  );
}

export function NutritionSkeleton() {
  return (
    <main className="min-h-screen px-6 pb-[72px] bg-[#171817]" aria-busy="true" aria-label="Cargando nutricion">
      <header className="w-full max-w-[1060px] mx-auto min-h-[82px] flex items-center justify-between border-b border-[#30332f]">
        <Block className="w-[140px] h-[22px]" />
        <Block className="w-[100px] h-8 rounded-[8px]" />
      </header>
      <section className="w-full max-w-[1060px] mx-auto pt-[50px] pb-[30px]">
        <Block className="w-[90px] h-3 mb-3.5" />
        <Block className="w-[300px] h-9 mb-2" />
        <Block className="w-[85%] h-3.5" />
      </section>
      <section className="w-full max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-[18px]">
        {[0, 1].map((i) => (
          <div key={i} className="p-6 border border-[#41433f] rounded-lg bg-[#212320]">
            <Block className="w-[40%] h-[18px] mb-4" />
            <Block className="w-full h-10 mb-3" />
            <Block className="w-full h-10 mb-3" />
            <Block className="w-[70%] h-3.5" />
          </div>
        ))}
      </section>
    </main>
  );
}