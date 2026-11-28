"use client";

import { navigation } from "./content.mjs";

export default function MobileMenu() {
  function selectSection(event) {
    const menu = event.currentTarget.closest("details");
    menu.open = false;
    const heading = document.querySelector(`${event.currentTarget.hash} h2`);
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }

  return <details className="ll-mobile-menu" onKeyDown={(event) => {
    if (event.key !== "Escape" || !event.currentTarget.open) return;
    event.currentTarget.open = false;
    event.currentTarget.querySelector("summary").focus();
  }}>
    <summary>Menú</summary>
    <nav aria-label="Navegación móvil">
      {navigation.map(([href, label]) => <a key={href} href={href} onClick={selectSection}>{label}</a>)}
      <a href="/login">Ingresar</a>
      <a href="/register">Crear cuenta</a>
    </nav>
  </details>;
}
