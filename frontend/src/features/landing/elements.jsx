export const icons = {
  training: "M6 5v14M18 5v14M3 8v8m18-8v8M6 12h12",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  history: "M3 12a9 9 0 1 1 2 6M3 5v7h7m2-5v5l3 2",
  nutrition: "M12 20c-5-7-8-8-8-12a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 4-3 5-8 12z",
  chart: "M3 3v18h18M7 15l5-5 3 3 5-6",
  book: "M12 6v15M3 4h4a5 5 0 0 1 5 2 5 5 0 0 1 5-2h4v14h-4a5 5 0 0 0-5 3 5 5 0 0 0-5-3H3z",
  home: "M3 10l9-7 9 7v10H3zM10 20v-6h4v6",
  star: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  gym: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-7h6v7",
  user: "M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  check: "m5 12 4 4L19 6",
};

export function Icon({ name }) {
  return <svg className="ll-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name]} /></svg>;
}

export function Brand() {
  return <a className="ll-brand" href="/"><span className="ll-mark"><Icon name="training" /></span> J&amp;J <span>GYM</span></a>;
}

export function SectionHeading({ label, children, id }) {
  return <div className="ll-heading"><p className="ll-kicker">{label}</p><h2 id={id}>{children}</h2></div>;
}
