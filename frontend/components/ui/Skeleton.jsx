export function Skeleton({ width = "100%", height = 14, radius = 8, circle = false, style = {} }) {
  return (
    <span
      className="skeleton-block"
      style={{
        display: "block",
        width,
        height: circle ? width : height,
        borderRadius: circle ? "50%" : radius,
        ...style,
      }}
    />
  );
}

export function MemberDashboardSkeleton() {
  return (
    <main className="member-home" aria-busy="true" aria-label="Cargando panel">
      <header className="member-header">
        <Skeleton width={140} height={22} />
        <Skeleton width={100} height={32} radius={8} />
      </header>
      <section className="member-welcome">
        <Skeleton width={120} height={12} style={{ marginBottom: 10 }} />
        <Skeleton width={220} height={26} style={{ marginBottom: 10 }} />
        <Skeleton width="70%" height={14} />
      </section>
      <section className="member-sections">
        {[0, 1].map((i) => (
          <article className="member-section skeleton-card" key={i}>
            <Skeleton width={34} height={34} circle style={{ marginBottom: 12 }} />
            <Skeleton width="50%" height={12} style={{ marginBottom: 8 }} />
            <Skeleton width="80%" height={20} style={{ marginBottom: 10 }} />
            <Skeleton width="95%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="60%" height={14} />
          </article>
        ))}
      </section>
    </main>
  );
}

export function ExerciseListSkeleton() {
  return (
    <main className="member-home exercise-home" aria-busy="true" aria-label="Cargando grupos musculares">
      <header className="member-header">
        <Skeleton width={140} height={22} />
        <Skeleton width={100} height={32} radius={8} />
      </header>
      <section className="exercise-heading">
        <Skeleton width={90} height={12} style={{ marginBottom: 14 }} />
        <Skeleton width={110} height={12} style={{ marginBottom: 10 }} />
        <Skeleton width="55%" height={24} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={14} />
      </section>
      <section className="muscle-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="muscle-card skeleton-card" key={i}>
            <Skeleton width={24} height={12} style={{ marginBottom: 14 }} />
            <Skeleton width="60%" height={18} style={{ marginBottom: 8 }} />
            <Skeleton width="40%" height={12} />
          </div>
        ))}
      </section>
    </main>
  );
}

export function ExerciseGroupSkeleton() {
  return (
    <main className="member-home exercise-home" aria-busy="true" aria-label="Cargando ejercicios">
      <header className="member-header">
        <Skeleton width={140} height={22} />
        <Skeleton width={100} height={32} radius={8} />
      </header>
      <section className="exercise-heading">
        <Skeleton width={90} height={12} style={{ marginBottom: 14 }} />
        <Skeleton width={110} height={12} style={{ marginBottom: 10 }} />
        <Skeleton width="55%" height={24} style={{ marginBottom: 8 }} />
        <Skeleton width="85%" height={14} />
      </section>
      <section className="exercise-card-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="exercise-card skeleton-card" key={i}>
            <Skeleton width={24} height={12} style={{ marginBottom: 14 }} />
            <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
            <Skeleton width="50%" height={12} />
          </div>
        ))}
      </section>
    </main>
  );
}

export function NutritionSkeleton() {
  return (
    <main className="member-home exercise-home" aria-busy="true" aria-label="Cargando nutricion">
      <header className="member-header">
        <Skeleton width={140} height={22} />
        <Skeleton width={100} height={32} radius={8} />
      </header>
      <section className="exercise-heading">
        <Skeleton width={90} height={12} style={{ marginBottom: 14 }} />
        <Skeleton width="55%" height={24} style={{ marginBottom: 8 }} />
        <Skeleton width="85%" height={14} />
      </section>
      <section className="nutrition-layout">
        {[0, 1].map((i) => (
          <div className="nutrition-card skeleton-card" key={i}>
            <Skeleton width="40%" height={18} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={40} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={40} style={{ marginBottom: 12 }} />
            <Skeleton width="70%" height={14} />
          </div>
        ))}
      </section>
    </main>
  );
}