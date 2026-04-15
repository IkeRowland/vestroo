import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import jsxA11y from "eslint-plugin-jsx-a11y";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** FE.5.8 — jsx-a11y on internal shells only; severities downgraded to warn to avoid blocking unrelated refactors */
const shellA11yFiles = [
  "src/app/(ops)/**/*.{js,jsx,ts,tsx}",
  "src/app/(field)/**/*.{js,jsx,ts,tsx}",
  "src/features/ops/**/*.{js,jsx,ts,tsx}",
  "src/features/field/**/*.{js,jsx,ts,tsx}",
];

const jsxA11yBase = jsxA11y.flatConfigs.recommended;

function jsxA11yRulesAsWarn(rules) {
  const out = {};
  for (const [id, cfg] of Object.entries(rules)) {
    if (cfg === "error" || cfg === 2) {
      out[id] = "warn";
    } else if (Array.isArray(cfg)) {
      const [sev, ...rest] = cfg;
      out[id] =
        sev === "error" || sev === 2 ? ["warn", ...rest] : cfg;
    } else {
      out[id] = cfg;
    }
  }
  return out;
}

const eslintConfig = [
  {
    ignores: [
      "src/legacy/**",
      "src/features/capstone-reference/**",
      "docs/capstone-reference/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  /* jsx-a11y plugin is already registered by eslint-config-next; extend recommended rules for internal shells only (FE.5.8) */
  {
    files: shellA11yFiles,
    rules: jsxA11yRulesAsWarn(jsxA11yBase.rules),
  },
];

export default eslintConfig;
