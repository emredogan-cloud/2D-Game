import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

// Flat config (ESLint 9). typescript-eslint's "recommended" preset is type-aware
// enough for our needs without requiring a full type-checked lint pass, and it
// does not enable core `no-undef` (TypeScript already handles that), so browser
// and test globals lint cleanly. `eslint-config-prettier` is last to disable any
// stylistic rules that would conflict with Prettier formatting.
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".vite/**",
      "public/assets/**",
      "tiled/**",
      "frames/**",
    ],
  },
  ...tseslint.configs.recommended,
  prettier,
);
