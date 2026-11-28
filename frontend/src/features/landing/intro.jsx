import { muscleGroups } from "@/src/features/exercises/lib/muscleGroups";
import { gyms, navigation } from "./content.mjs";
import { Brand, Icon } from "./elements";
import MobileMenu from "./mobile-menu";

export function LandingHeader() {
  return <header className="ll-header">
    <div className="ll-wrap ll-header-row">
      <Brand />
      <nav className="ll-desktop-nav" aria-label="Navegación principal">
        {navigation.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </nav>
      <div className="ll-header-actions">
        <a className="ll-login" href="/login">Ingresar</a>
        <a className="ll-button ll-primary" href="/register">Crear cuenta</a>
      </div>
      <MobileMenu />
    </div>
  </header>;
}

export function HeroSection() {
  return <section className="ll-wrap ll-hero" aria-labelledby="ll-title">
    <div className="ll-hero-copy">
      <p className="ll-kicker">Plataforma de entrenamiento y gestión deportiva</p>
      <h1 id="ll-title">Entrena mejor.<br /><em>Evoluciona contigo.</em></h1>
      <p>Organiza tus rutinas, registra tus entrenamientos, consulta tu progreso y gestiona tu actividad deportiva desde una sola plataforma.</p>
      <div className="ll-actions">
        <a className="ll-button ll-primary" href="/register">Crear mi cuenta</a>
        <a className="ll-button ll-secondary" href="#funcionalidades">Explorar plataforma</a>
      </div>
    </div>
    <div className="ll-hero-visual">
      <img src="/landing/hero.webp" srcSet="/landing/hero-small.webp 560w, /landing/hero.webp 1080w" sizes="(max-width: 767px) 94vw, 51vw" width="1080" height="1050" fetchPriority="high" alt="Deportista levantando una barra en un gimnasio" />
      <a className="ll-hero-preview" href="#demostracion"><Icon name="training" /><span><strong>J&amp;J GYM en acción</strong><small>Explora la interfaz de entrenamiento</small></span><picture><source media="(min-width: 48rem)" srcSet="/landing/hero-product.webp" /><img width="650" height="163" decoding="async" alt="" /></picture></a>
    </div>
  </section>;
}

export function PlatformStats() {
  const exerciseCount = muscleGroups.reduce((total, group) => total + group.exercises.length, 0);
  const stats = [
    ["training", exerciseCount, "Ejercicios guiados"],
    ["chart", muscleGroups.length, "Grupos musculares"],
    ["gym", gyms.length, "Sedes asociadas"],
  ];

  return <section className="ll-wrap ll-stats" aria-label="J&J GYM en cifras">
    <ul>{stats.map(([icon, value, label]) => <li key={label}>
      <Icon name={icon} /><strong>{value}</strong><span>{label}</span>
    </li>)}</ul>
  </section>;
}
