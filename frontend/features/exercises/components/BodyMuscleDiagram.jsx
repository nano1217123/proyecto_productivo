"use client";

import { useMemo, useState, useEffect } from "react";
import { MUSCLES } from "../lib/muscleMap";

const BASE_FILL = "#33362f";
const BASE_STROKE = "#20221d";
const OUTLINE_FILL = "#2a2d27";

function regionStyle(id, primary, secondary, accent) {
  if (primary.includes(id)) return { fill: accent, opacity: 0.95, stroke: accent, strokeWidth: 1.5 };
  if (secondary.includes(id)) return { fill: accent, opacity: 0.4, stroke: accent, strokeWidth: 1, strokeDasharray: "3 2" };
  return { fill: OUTLINE_FILL, opacity: 1, stroke: BASE_STROKE, strokeWidth: 0.75 };
}

function FrontBody({ primary, secondary, accent }) {
  const s = (id) => regionStyle(id, primary, secondary, accent);
  return (
    <svg viewBox="0 0 200 440" role="img" aria-label="Vista frontal del cuerpo">
      <ellipse cx="100" cy="30" rx="22" ry="26" fill={BASE_FILL} stroke={BASE_STROKE} />
      <rect x="90" y="52" width="20" height="18" fill={BASE_FILL} />
      <path d="M60 70 Q100 60 140 70 L146 190 Q100 205 54 190 Z" fill={BASE_FILL} stroke={BASE_STROKE} />
      <path d="M60 190 L52 300 L70 300 L78 195 Z" fill={BASE_FILL} stroke={BASE_STROKE} />
      <path d="M140 190 L148 300 L130 300 L122 195 Z" fill={BASE_FILL} stroke={BASE_STROKE} />
      <path d="M70 298 L64 420 L86 420 L92 300 Z" fill={BASE_FILL} stroke={BASE_STROKE} />
      <path d="M130 298 L136 420 L114 420 L108 300 Z" fill={BASE_FILL} stroke={BASE_STROKE} />

      <ellipse cx="62" cy="78" rx="9" ry="12" {...s("frontDelt")} />
      <ellipse cx="52" cy="82" rx="9" ry="13" {...s("sideDelt")} />
      <ellipse cx="138" cy="78" rx="9" ry="12" {...s("frontDelt")} />
      <ellipse cx="148" cy="82" rx="9" ry="13" {...s("sideDelt")} />

      <path d="M74 78 Q100 71 126 78 L125 92 L75 92 Z" {...s("chestUpper")} />
      <path d="M75 92 L125 92 L124 108 L76 108 Z" {...s("chestMid")} />
      <path d="M76 108 L124 108 L122 118 Q100 128 78 118 Z" {...s("chestLower")} />

      <ellipse cx="52" cy="118" rx="11" ry="24" {...s("biceps")} />
      <ellipse cx="148" cy="118" rx="11" ry="24" {...s("biceps")} />

      <ellipse cx="48" cy="165" rx="9" ry="26" {...s("forearms")} />
      <ellipse cx="152" cy="165" rx="9" ry="26" {...s("forearms")} />

      <rect x="84" y="122" width="32" height="28" rx="4" {...s("absUpper")} />
      <rect x="84" y="152" width="32" height="30" rx="4" {...s("absLower")} />
      <line x1="100" y1="122" x2="100" y2="182" stroke={BASE_STROKE} strokeWidth="1" opacity="0.5" />

      <path d="M78 122 L84 182 L74 182 L70 128 Z" {...s("obliques")} />
      <path d="M122 122 L116 182 L126 182 L130 128 Z" {...s("obliques")} />

      <ellipse cx="76" cy="245" rx="14" ry="46" {...s("quadriceps")} />
      <ellipse cx="124" cy="245" rx="14" ry="46" {...s("quadriceps")} />
      <ellipse cx="90" cy="248" rx="6" ry="38" {...s("quadsInner")} />
      <ellipse cx="110" cy="248" rx="6" ry="38" {...s("quadsInner")} />

      <ellipse cx="78" cy="360" rx="11" ry="30" {...s("calvesGastro")} />
      <ellipse cx="122" cy="360" rx="11" ry="30" {...s("calvesGastro")} />
    </svg>
  );
}

function BackBody({ primary, secondary, accent }) {
  const s = (id) => regionStyle(id, primary, secondary, accent);
  return (
    <svg viewBox="0 0 200 440" role="img" aria-label="Vista posterior del cuerpo">
      <ellipse cx="100" cy="30" rx="22" ry="26" fill={BASE_FILL} stroke={BASE_STROKE} />
      <rect x="90" y="52" width="20" height="18" fill={BASE_FILL} />
      <path d="M60 70 Q100 60 140 70 L146 190 Q100 205 54 190 Z" fill={BASE_FILL} stroke={BASE_STROKE} />
      <path d="M60 190 L52 300 L70 300 L78 195 Z" fill={BASE_FILL} stroke={BASE_STROKE} />
      <path d="M140 190 L148 300 L130 300 L122 195 Z" fill={BASE_FILL} stroke={BASE_STROKE} />
      <path d="M70 298 L64 420 L86 420 L92 300 Z" fill={BASE_FILL} stroke={BASE_STROKE} />
      <path d="M130 298 L136 420 L114 420 L108 300 Z" fill={BASE_FILL} stroke={BASE_STROKE} />

      <path d="M84 68 L100 64 L116 68 L108 84 L100 88 L92 84 Z" {...s("trapsUpper")} />

      <ellipse cx="58" cy="80" rx="14" ry="16" {...s("rearDelt")} />
      <ellipse cx="142" cy="80" rx="14" ry="16" {...s("rearDelt")} />

      <path d="M80 84 L100 80 L120 84 L114 112 L100 118 L86 112 Z" {...s("trapsMid")} />

      <path d="M78 106 Q100 100 122 106 L128 152 Q100 170 72 152 Z" {...s("lats")} />

      <ellipse cx="52" cy="118" rx="11" ry="24" {...s("triceps")} />
      <ellipse cx="148" cy="118" rx="11" ry="24" {...s("triceps")} />

      <ellipse cx="48" cy="165" rx="9" ry="26" {...s("forearms")} />
      <ellipse cx="152" cy="165" rx="9" ry="26" {...s("forearms")} />

      <rect x="84" y="152" width="32" height="30" rx="6" {...s("lowerBack")} />

      <path d="M70 184 Q100 176 130 184 L126 212 Q100 222 74 212 Z" {...s("glutesMax")} />
      <ellipse cx="66" cy="188" rx="8" ry="10" {...s("glutesMed")} />
      <ellipse cx="134" cy="188" rx="8" ry="10" {...s("glutesMed")} />

      <ellipse cx="80" cy="255" rx="16" ry="40" {...s("hamstrings")} />
      <ellipse cx="120" cy="255" rx="16" ry="40" {...s("hamstrings")} />

      <ellipse cx="78" cy="350" rx="12" ry="18" {...s("calvesGastro")} />
      <ellipse cx="122" cy="350" rx="12" ry="18" {...s("calvesGastro")} />
      <ellipse cx="78" cy="378" rx="10" ry="16" {...s("calvesSoleus")} />
      <ellipse cx="122" cy="378" rx="10" ry="16" {...s("calvesSoleus")} />
    </svg>
  );
}

export default function BodyMuscleDiagram({ primaryMuscles = [], secondaryMuscles = [], accent = "#7fd6c2" }) {
  const suggestedView = useMemo(() => {
    const allIds = [...primaryMuscles, ...secondaryMuscles];
    const backCount = allIds.filter((id) => MUSCLES[id]?.view === "back").length;
    const frontCount = allIds.filter((id) => MUSCLES[id]?.view === "front").length;
    return backCount > frontCount ? "back" : "front";
  }, [primaryMuscles, secondaryMuscles]);

  const [view, setView] = useState(suggestedView);
  useEffect(() => setView(suggestedView), [suggestedView]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1.5">
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs border ${view === "front" ? "bg-white/15 text-white border-white/20" : "bg-white/5 text-[#a9afa7] border-white/10"}`}
          onClick={() => setView("front")}
        >
          Frontal
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs border ${view === "back" ? "bg-white/15 text-white border-white/20" : "bg-white/5 text-[#a9afa7] border-white/10"}`}
          onClick={() => setView("back")}
        >
          Posterior
        </button>
      </div>
      <div className="w-[140px] sm:w-[170px]">
        {view === "front"
          ? <FrontBody primary={primaryMuscles} secondary={secondaryMuscles} accent={accent} />
          : <BackBody primary={primaryMuscles} secondary={secondaryMuscles} accent={accent} />}
      </div>
    </div>
  );
}