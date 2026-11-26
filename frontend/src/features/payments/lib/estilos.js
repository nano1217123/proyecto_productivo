// Clases compartidas por las pantallas de pagos (estilo JJ GYM).
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7adff]";

export const cardClass =
  "p-6 border border-[#41433f] rounded-lg bg-[#212320] text-[#f2f4ef]";

export const primaryButton = `inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-md border-0 bg-[#b56cff] text-white text-sm font-extrabold no-underline cursor-pointer hover:bg-[#a457f2] disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;

export const secondaryButton = `inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-md border border-[#41433f] bg-transparent text-[#a9afa7] text-sm font-bold cursor-pointer hover:text-[#f2f4ef] hover:border-[#6f756b] disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;
