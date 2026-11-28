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
  scale: "M12 3v17m-5 0h10M4 7h16M6 7l-3 7h6L6 7Zm12 0-3 7h6l-3-7Z",
  ruler: "m4 8 4-4 12 12-4 4L4 8Zm7 0-2 2m6 2-2 2m6 2-2 2",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0V4Zm0 2H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4m-5 2v6m-5 0h10",
  nutrition: "M5 3v7a3 3 0 0 0 6 0V3M8 3v18M18 3c-2 2-3 5-3 9h3m0-9v18",
  reviews: "M4 5h16v12H9l-5 4V5Zm4 5h8m-8 3h5",
  card: "M3 5h18v14H3zm0 5h18m-14 5h4",
  menu: "M4 6h16M4 12h16M4 18h16",
  exit: "M11 5H4v14h7m-1-7h10m-4-4 4 4-4 4",

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
