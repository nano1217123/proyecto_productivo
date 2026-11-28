// Public display snapshot of backend/src/lib/{sedes,pagosPrecios}.ts.
// The frontend can build in isolation, and the checkout catalog requires a session.
export const gyms = [
  { slug: "jj-poblado", name: "JJ GYM El Poblado", location: "El Poblado, Medellín", image: "poblado" },
  { slug: "power-laureles", name: "Power Laureles", location: "Laureles, Medellín", image: "laureles" },
  // Preserve the exact public entry URL. The backend catalog uses fit-belen.
  { slug: "fit-belén", name: "Fit Lab Belén", location: "Belén, Medellín", image: "belen" },
];

export const navigation = [
  ["#imc", "Calculadora IMC"],
  ["#funcionalidades", "Funcionalidades"],
  ["#sedes", "Gimnasios"],
  ["#como-funciona", "Cómo funciona"],
  ["#planes", "Planes"],
];

export const plans = [
  {
    id: "suscripcion_particular",
    name: "Plan Individual",
    audience: "Para quienes entrenan por su cuenta",
    price: 1000,
    period: "mensual",
    icon: "training",
    benefits: ["Registro e historial de entrenamientos", "Rutinas personalizadas", "Registro de nutrición y seguimiento de progreso", "Catálogo de ejercicios en casa"],
    href: "/register",
    action: "Crear cuenta",
  },
  {
    id: "suscripcion_sede",
    name: "Plan Gimnasio",
    audience: "Para administradores de gimnasio",
    price: 15000,
    period: "mensual",
    icon: "gym",
    benefits: ["Gestión de clientes y membresías", "Administración de sedes asignadas", "Estadísticas y reportes de membresías", "Gestión y reportes de reseñas"],
    href: "/dashboard/pagos",
    action: "Ir a suscripciones",
  },
];

export const features = [
  ["training", "Registro de entrenamiento", "Registra series, repeticiones, cargas y sesiones de entrenamiento."],
  ["list", "Mis rutinas", "Crea y organiza rutinas adaptadas a tu planificación."],
  ["history", "Historial de entrenamientos", "Consulta y reutiliza tus sesiones anteriores."],
  ["nutrition", "Mi nutrición", "Consulta alimentos, referencias proteicas y registros nutricionales."],
  ["chart", "Mi progreso", "Visualiza la evolución de tus registros y rendimiento deportivo."],
  ["book", "Catálogo de ejercicios", "Explora ejercicios por grupo muscular y consulta el equipamiento necesario."],
  ["home", "Ejercicios en casa", "Encuentra variantes para entrenar sin máquinas de gimnasio."],
  ["star", "Reseñas", "Consulta las experiencias de otros usuarios sobre los gimnasios asociados."],
];

export const faq = [
  ["¿Qué es J&J GYM?", "Una plataforma para organizar el entrenamiento personal y gestionar la actividad de gimnasios asociados."],
  ["¿Necesito pertenecer a un gimnasio para utilizar la plataforma?", "Puedes crear una cuenta particular y utilizar herramientas de entrenamiento autónomo, incluido el catálogo de ejercicios en casa."],
  ["¿Qué incluye el Plan Individual?", "Registro de entrenamientos, rutinas, historial, catálogo para casa, nutrición y seguimiento del progreso."],
  ["¿Qué incluye el Plan Gimnasio?", "Herramientas de gestión de clientes, membresías, estadísticas y reseñas para administradores de sedes asignadas."],
  ["¿Puedo utilizar la plataforma desde mi celular?", "Sí. Puedes entrar a J&J GYM desde el navegador de tu celular, tablet o computador."],
  ["¿Cómo se procesan los pagos?", "El pago se inicia desde el área de suscripciones de una cuenta habilitada y se procesa con Wompi. Allí se muestra el importe en pesos colombianos antes de continuar."],
  ["¿Cómo puedo acceder a un gimnasio asociado?", "Elige tu gimnasio en la sección de sedes y sigue el enlace de acceso para iniciar sesión."],
];
