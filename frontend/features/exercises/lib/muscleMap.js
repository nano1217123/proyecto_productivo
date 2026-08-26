// Taxonomía anatómica centralizada. Cada región tiene:
// - label: nombre del músculo (para "Músculo principal")
// - zone: descripción anatómica de la ubicación exacta (para "Zona")
// - view: en qué vista del cuerpo es visible ("front" | "back")
export const MUSCLES = {
  chestUpper:   { label: "Pectoral superior",              zone: "Parte alta del pecho, cerca de la clavícula", view: "front" },
  chestMid:     { label: "Pectoral mayor",                 zone: "Zona central del pecho",                       view: "front" },
  chestLower:   { label: "Pectoral inferior",               zone: "Parte baja del pecho, cerca del esternón",     view: "front" },

  frontDelt:    { label: "Deltoide anterior",               zone: "Parte frontal del hombro",                     view: "front" },
  sideDelt:     { label: "Deltoide lateral",                 zone: "Parte externa del hombro",                     view: "front" },
  rearDelt:     { label: "Deltoide posterior",               zone: "Parte trasera del hombro, junto al omóplato",  view: "back" },

  biceps:       { label: "Biceps braquial",                 zone: "Parte frontal del brazo",                      view: "front" },
  triceps:      { label: "Triceps braquial",                zone: "Parte posterior del brazo",                    view: "back" },
  forearms:     { label: "Antebrazo",                       zone: "Entre el codo y la muneca",                    view: "front" },

  absUpper:     { label: "Recto abdominal (superior)",       zone: "Parte alta del abdomen",                       view: "front" },
  absLower:     { label: "Recto abdominal (inferior)",       zone: "Parte baja del abdomen",                       view: "front" },
  obliques:     { label: "Oblicuos",                         zone: "Laterales del abdomen y la cintura",           view: "front" },

  trapsUpper:   { label: "Trapecio superior",                zone: "Base del cuello, entre cuello y hombros",      view: "back" },
  trapsMid:     { label: "Trapecio medio y romboides",       zone: "Entre los omoplatos",                          view: "back" },
  lats:         { label: "Dorsal ancho",                     zone: "Porcion lateral de la espalda, bajo la axila", view: "back" },
  lowerBack:    { label: "Espalda baja (erectores espinales)", zone: "Zona lumbar",                                view: "back" },

  quadriceps:   { label: "Cuadriceps",                       zone: "Parte frontal del muslo",                      view: "front" },
  quadsInner:   { label: "Aductores",                        zone: "Cara interna del muslo",                       view: "front" },

  glutesMax:    { label: "Gluteo mayor",                     zone: "Masa principal del gluteo",                    view: "back" },
  glutesMed:    { label: "Gluteo medio (abductores de cadera)", zone: "Lateral superior de la cadera",              view: "back" },
  hamstrings:   { label: "Isquiotibiales",                   zone: "Parte posterior del muslo",                    view: "back" },

  calvesGastro: { label: "Gastrocnemio",                     zone: "Parte alta y visible de la pantorrilla",       view: "back" },
  calvesSoleus: { label: "Soleo",                            zone: "Parte baja de la pantorrilla",                 view: "back" },
};

// Patrones ordenados de más específico a más general. Se evalúan en orden;
// el primero que matchea gana. Esto es lo que permite distinguir
// "Pectoral superior" de "Pectoral inferior" de "Pectoral mayor" (genérico),
// en vez de mandarlos todos a un mismo "chest".
const KEYWORD_MAP = [
  [/pectoral superior/, "chestUpper"],
  [/pectoral inferior/, "chestLower"],
  [/pector/, "chestMid"], // fibras internas/externas y "pectoral mayor" genérico

  [/deltoide anterior/, "frontDelt"],
  [/deltoide (medio|lateral)/, "sideDelt"],
  [/deltoide posterior/, "rearDelt"],

  [/biceps|braquial/, "biceps"],
  [/triceps/, "triceps"],
  [/antebrazo/, "forearms"],

  [/trapecio superior/, "trapsUpper"],
  [/trapecio|romboide/, "trapsMid"], // "trapecio medio" y romboides = misma zona visual

  [/dorsal/, "lats"],
  [/espalda baja|lumbar|erector/, "lowerBack"],

  [/recto abdominal inferior/, "absLower"],
  [/recto abdominal/, "absUpper"],
  [/oblicuo/, "obliques"],
  [/core(?!.*espalda)/, "absUpper"], // "core" genérico como proxy del abdomen

  [/muslo interno|aductor/, "quadsInner"],
  [/muslo externo|gluteo medio|abductor/, "glutesMed"],
  [/cuadriceps/, "quadriceps"],
  [/isquiotibial/, "hamstrings"],
  [/gluteo/, "glutesMax"], // después de "gluteo medio" arriba

  [/gastrocnemio/, "calvesGastro"],
  [/soleo/, "calvesSoleus"],
  [/pantorrilla/, "calvesGastro"], // genérico, sin distinción → asumo la parte visible
];

// Caso especial: "Deltoide (los tres haces)" activa las 3 cabezas a la vez
// (ej. Press Arnold), no matchea bien por fragmento.
function specialCase(text) {
  if (/tres haces/.test(text)) return ["frontDelt", "sideDelt", "rearDelt"];
  return null;
}

const GROUP_FALLBACK = {
  pecho: ["chestMid"],
  espalda: ["lats"],
  hombros: ["sideDelt"],
  brazos: ["biceps", "triceps"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  piernas: ["quadriceps", "glutesMax", "hamstrings"],
  muslos: ["quadriceps"],
  gluteos: ["glutesMax"],
  pantorrillas: ["calvesGastro", "calvesSoleus"],
  abdominales: ["absUpper"],
  cintura: ["obliques"],
  "espalda-baja": ["lowerBack"],
};

function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function musclesFromText(text) {
  if (!text) return [];
  const normalized = normalize(text);
  const special = specialCase(normalized);
  if (special) return special;

  const fragments = normalized.split(/,| y | e /);
  const found = [];
  for (const fragment of fragments) {
    for (const [pattern, id] of KEYWORD_MAP) {
      if (pattern.test(fragment) && !found.includes(id)) {
        found.push(id);
        break;
      }
    }
  }
  return found;
}

/**
 * Determina qué regiones musculares resaltar para un ejercicio.
 * @returns {{primary: string[], secondary: string[]}}
 */
export function getExerciseMuscles(exercise, groupSlug) {
  const matched = musclesFromText(exercise?.primary);
  const fallback = GROUP_FALLBACK[groupSlug] || [];

  if (matched.length === 0) {
    return { primary: fallback.slice(0, 1), secondary: fallback.slice(1) };
  }

  const primary = matched.length > 1 && specialCase(normalize(exercise.primary))
    ? matched // caso "tres haces": las 3 cabezas son igual de principales
    : [matched[0]];

  const secondary = matched.length > 1 && primary === matched
    ? []
    : [...matched.slice(1), ...fallback.filter((id) => !matched.includes(id))]
        .filter((id, i, arr) => arr.indexOf(id) === i && !primary.includes(id));

  return { primary, secondary };
}

/**
 * Estructura completa para mostrar Grupo / Músculo principal / Zona /
 * Secundarios / Vista, tal como se pide en la ficha de cada ejercicio.
 */
export function getExerciseAnatomy(exercise, groupSlug, groupLabel) {
  const { primary, secondary } = getExerciseMuscles(exercise, groupSlug);
  const primaryInfo = primary.map((id) => ({ id, ...MUSCLES[id] }));
  const secondaryInfo = secondary.map((id) => ({ id, ...MUSCLES[id] }));

  const backCount = [...primary, ...secondary].filter((id) => MUSCLES[id]?.view === "back").length;
  const frontCount = [...primary, ...secondary].filter((id) => MUSCLES[id]?.view === "front").length;
  const vista = backCount > frontCount ? "Posterior" : "Frontal";

  return {
    grupo: groupLabel,
    principal: primaryInfo,
    secundarios: secondaryInfo,
    vista,
    primaryIds: primary,
    secondaryIds: secondary,
  };
}