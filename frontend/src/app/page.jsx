import "@/src/features/landing/landing.css";
import { HeroSection, LandingHeader, PlatformStats } from "@/src/features/landing/intro";

import { AudienceSection, FeaturesSection, GymsSection, ProductSection } from "@/src/features/landing/product";

import { BMISection, FAQSection, FinalCTA, HowItWorks, LandingFooter, PricingSection } from "@/src/features/landing/commercial";

const title = "J&J GYM | Plataforma de entrenamiento y gestión deportiva";
const description = "Organiza tus rutinas, registra tus entrenamientos y gestiona tu actividad deportiva con J&J GYM.";

export const metadata = {
  metadataBase: new URL("https://proyecto-productivo-tjvz-two.vercel.app"),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title, description, url: "/", siteName: "J&J GYM", locale: "es_CO", type: "website",
    images: [{ url: "/landing/hero.webp", width: 1080, height: 1050, alt: "Entrenamiento con barra" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/landing/hero.webp"] },
  icons: { icon: "/landing/icon.svg" },
  robots: { index: true, follow: true },
};

export default function Home() {
  return <div className="ll">
    <a className="ll-skip" href="#contenido">Saltar al contenido</a>
    <LandingHeader />
    <main id="contenido" tabIndex={-1}>
      <HeroSection />
      <PlatformStats />
      <FeaturesSection />
      <ProductSection />
      <AudienceSection />
      <GymsSection />
      <HowItWorks />
      <PricingSection />
      <BMISection />
      <FAQSection />
      <FinalCTA />
    </main>
    <LandingFooter />
  </div>;
}
