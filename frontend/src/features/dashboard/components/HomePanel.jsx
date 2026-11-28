export function HomePanel({ title, action, className = "", children }) {
  return <section className={`home-panel ${className}`}>
    <header className="home-panel-head"><h2>{title}</h2>{action}</header>
    {children}
  </section>;
}

export function SectionState({ result, retry, children }) {
  if (result.error) return <div className="home-error" role="alert">
    <p>{typeof navigator !== "undefined" && !navigator.onLine ? "Sin conexión." : "No pudimos cargar esta sección."}</p>
    <button type="button" className="home-link" onClick={retry}>Reintentar</button>
  </div>;
  if (result.data === undefined) return <div className="home-loading" role="status">
    <span className="home-skeleton" /> <span className="sr-only">Cargando…</span>
  </div>;
  return children(result.data);
}

const paths = {
  training: "M6 7v10m12-10v10M3 10v4m18-4v4M6 12h12M9 5v14m6-14v14",
  routine: "M8 5H5v16h14V5h-3M8 3h8v4H8zm0 8h8m-8 5h8",
  history: "M4 12a8 8 0 1 1 2 5m-2 0v-5h5m3-5v5l3 2",
  house: "m3 11 9-8 9 8M6 10v10h12V10m-8 10v-6h4v6",
  time: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  trend: "M4 19V5m0 14h16M8 14l4-4 3 2 5-6",
  arrow: "M6 18 18 6M8 6h10v10",
};

export function HomeIcon({ name }) {
  return <svg aria-hidden="true" className="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>;
}
