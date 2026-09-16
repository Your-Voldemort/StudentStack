import { Anybody, Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";

// Student-pass type system (homepage + /submit). Anybody's width axis lets one
// family run wide on the card and narrow for numbers; Atkinson Hyperlegible
// carries everything people actually read. The mono is only for the card's
// machine-readable line and small data labels.
const display = Anybody({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-pass-display",
  display: "swap",
});

// next/font has no metric overrides for the Atkinson families, so it can't
// generate size-matched fallbacks; declare the fallback stacks explicitly.
const body = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-pass-body",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const mono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  variable: "--font-pass-mono",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const passFontVariables = `${display.variable} ${body.variable} ${mono.variable}`;
