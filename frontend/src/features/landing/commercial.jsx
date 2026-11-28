import { formatearUsd, nombrePeriodo } from "@/src/features/payments/lib/payments";
import { faq, navigation, plans } from "./content.mjs";
import { Brand, Icon, SectionHeading } from "./elements";
import BMICalculator from "./bmi-calculator";

const steps = [
  ["user", "Crea tu cuenta", "Regístrate y accede a las funciones correspondientes a tu perfil."],
  ["training", "Organiza tu actividad", "Crea rutinas, registra entrenamientos o gestiona tu gimnasio."],
  ["chart", "Consulta tus resultados", "Revisa tu actividad y las estadísticas disponibles en tu cuenta."],
];

export function HowItWorks() {
  return <section className="ll-section" id="como-funciona" aria-labelledby="ll-steps">
    <div className="ll-wrap">
      <SectionHeading label="Cómo funciona" id="ll-steps">Comienza en tres pasos.</SectionHeading>
      <ol className="ll-steps">
        {steps.map(([icon, title, description], index) => <li key={title}>
          <div className="ll-step-count"><Icon name={icon} /><span aria-hidden="true">0{index + 1}</span></div>
          <h3>{title}</h3><p>{description}</p>
        </li>)}
      </ol>
    </div>
  </section>;
}

export function PricingSection() {
  return <section className="ll-section ll-pricing" id="planes" aria-labelledby="ll-plans">
    <div className="ll-wrap">
      <SectionHeading label="Planes y suscripciones" id="ll-plans">Elige tu experiencia.</SectionHeading>
      <div className="ll-plan-grid">
        {plans.map((plan) => <article key={plan.id} id={plan.id === "suscripcion_sede" ? "plan-gimnasio" : "plan-individual"} className="ll-plan">
          <Icon name={plan.icon} />
          <h3>{plan.name}</h3>
          <p>{plan.audience}</p>
          <p className="ll-price"><strong>{formatearUsd(plan.price)}</strong> / {nombrePeriodo(plan.period)}</p>
          <ul>{plan.benefits.map((benefit) => <li key={benefit}><Icon name="check" />{benefit}</li>)}</ul>
          <a className="ll-button ll-primary" href={plan.href}>{plan.action}</a>
        </article>)}
      </div>
      <p className="ll-payment-note">Precios de referencia en USD. El importe en pesos colombianos se muestra en el área de suscripciones. Pagos procesados mediante Wompi.</p>
    </div>
  </section>;
}

export function BMISection() {
  return <section className="ll-section" id="imc" aria-labelledby="ll-imc">
    <div className="ll-wrap ll-bmi">
      <div>
        <SectionHeading label="Índice de masa corporal" id="ll-imc">Calculadora IMC</SectionHeading>
        <p>Introduce tu peso y tu altura para calcular una estimación de tu IMC.</p>
        <p>El IMC es un indicador orientativo. No constituye un diagnóstico médico ni una evaluación completa de la composición corporal.</p>
      </div>
      <BMICalculator />
    </div>
  </section>;
}

export function FAQSection() {
  return <section className="ll-section" id="preguntas" aria-labelledby="ll-faq">
    <div className="ll-wrap ll-faq">
      <h2 id="ll-faq">Preguntas frecuentes</h2>
      <div>{faq.map(([question, answer]) => <details key={question}>
        <summary>{question}<span aria-hidden="true" /></summary><p>{answer}</p>
      </details>)}</div>
    </div>
  </section>;
}

export function FinalCTA() {
  return <section className="ll-section ll-final" aria-labelledby="ll-final">
    <div className="ll-wrap">
      <h2 id="ll-final">Tu próximo paso comienza aquí.</h2>
      <p>Descubre una nueva forma de organizar tu entrenamiento y gestionar tu actividad deportiva.</p>
      <div className="ll-actions">
        <a className="ll-button ll-primary" href="/register">Crear mi cuenta</a>
        <a className="ll-button ll-secondary" href="/login">Iniciar sesión</a>
      </div>
    </div>
  </section>;
}

export function LandingFooter() {
  return <footer className="ll-footer">
    <div className="ll-wrap">
      <div className="ll-footer-grid">
        <Brand />
        <nav aria-label="Plataforma"><h2>Plataforma</h2>
          {navigation.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          <a href="#preguntas">Preguntas frecuentes</a>
        </nav>
        <nav aria-label="Cuenta"><h2>Cuenta</h2>
          <a href="/login">Iniciar sesión</a>
          <a href="/register">Crear cuenta</a>
        </nav>
      </div>
      <p className="ll-copyright">© {new Date().getUTCFullYear()} J&amp;J GYM</p>
    </div>
  </footer>;
}
