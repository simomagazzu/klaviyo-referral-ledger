import { createRequire } from "module";

const require = createRequire(import.meta.url);
const nextConfig = require("eslint-config-next");

// Reuse the @typescript-eslint plugin instance that next already loaded
const tsPlugin = nextConfig
  .find((c) => c.plugins?.["@typescript-eslint"])
  ?.plugins?.["@typescript-eslint"];

const eslintConfig = [
  // design/ holds the original Claude Design prototype, kept as reference only
  { ignores: ["design/**"] },
  ...nextConfig,
  ...(tsPlugin
    ? [
        {
          plugins: { "@typescript-eslint": tsPlugin },
          rules: {
            "@typescript-eslint/no-unused-vars": [
              "warn",
              { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
          },
        },
      ]
    : []),
];

export default eslintConfig;
