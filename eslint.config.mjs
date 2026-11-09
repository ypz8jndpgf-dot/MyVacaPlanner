import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: [".next/**", "node_modules/**", "data/**", "next-env.d.ts"] },
  {
    // Pre-existing form-default effects use this pattern and work; the rule is
    // newer than the codebase. Warn (don't error) until the post-trip refactor.
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
];

export default eslintConfig;
