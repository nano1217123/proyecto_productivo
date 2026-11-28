import { features, gyms } from "./content.mjs";
import { Icon, SectionHeading } from "./elements";
import ProductShowcase from "./showcase";

export function FeaturesSection() {
  return <section className="ll-section" id="funcionalidades" aria-labelledby="ll-features">
    <div className="ll-wrap">
      <SectionHeading label="Funcionalidades" id="ll-features">Todo para tu entrenamiento.</SectionHeading>
      <div className="ll-feature-grid">
        {features.map(([icon, name, description]) => <article className="ll-feature" key={name}>
          <Icon name={icon} />
          <div><h3>{name}</h3><p>{description}</p></div>
        </article>)}
      </div>
    </div>
  </section>;
}

export function ProductSection() {
  return <section className="ll-section ll-product" id="demostracion" aria-labelledby="ll-product">
    <div className="ll-wrap">
      <SectionHeading label="Demostración" id="ll-product">Así se ve J&amp;J GYM.</SectionHeading>
      <ProductShowcase />
    </div>
  </section>;
}

export function AudienceSection() {
  return <section className="ll-section" aria-labelledby="ll-audience">
    <div className="ll-wrap">
      <SectionHeading label="Deportistas y propietarios" id="ll-audience">Una plataforma. Dos experiencias.</SectionHeading>
      <div className="ll-audience">
        <article>
          <img src="/landing/deportistas-640.webp"
            srcSet="/landing/deportistas-640.webp 640w, /landing/deportistas-960.webp 960w"
            sizes="(min-width: 76rem) 36.5rem, (min-width: 40rem) calc(50vw - 1.5rem), calc(100vw - 2rem)"
            width="640" height="360" loading="lazy" decoding="async"
            alt="Deportista consultando su teléfono entre series" />
          <div className="ll-card-body">
            <p className="ll-kicker">Para deportistas</p>
            <h3>Tu entrenamiento, bajo control.</h3>
            <p>Planifica tu semana con rutinas propias. Registra tus sesiones, consulta la evolución de tus marcas y lleva un registro nutricional.</p>
            <a href="/register" className="ll-button ll-primary">Comenzar a entrenar</a>
          </div>
        </article>
        <article>
          <img src="/landing/owners.webp" width="760" height="460" loading="lazy" decoding="async" alt="" />
          <div className="ll-card-body">
            <p className="ll-kicker">Para propietarios</p>
            <h3>Tu gimnasio, mejor gestionado.</h3>
            <p>Administra clientes y membresías de tus sedes asignadas, revisa estadísticas y reportes, y responde a reseñas como administrador.</p>
            <a href="#plan-gimnasio" className="ll-button ll-secondary">Conocer el Plan Gimnasio</a>
          </div>
        </article>
      </div>
    </div>
  </section>;
}

export function GymsSection() {
  return <section className="ll-section" id="sedes" aria-labelledby="ll-gyms">
    <div className="ll-wrap">
      <SectionHeading label="Gimnasios asociados" id="ll-gyms">Encuentra tu sede.</SectionHeading>
      <div className="ll-gyms">
        {gyms.map((gym) => <article key={gym.slug}>
          <img src={`/landing/${gym.image}.webp`} width="760" height="460" loading="lazy" decoding="async" alt="" />
          <div className="ll-card-body">
            <p className="ll-kicker">{gym.location}</p>
            <h3>{gym.name}</h3>
            <a href={`/login?gym=${gym.slug}`} className="ll-button ll-secondary" aria-label={`Acceder a ${gym.name}`}>Acceder a la sede</a>
          </div>
        </article>)}
      </div>
      <p className="ll-photo-note">Fotografías de referencia.</p>
    </div>
  </section>;
}
