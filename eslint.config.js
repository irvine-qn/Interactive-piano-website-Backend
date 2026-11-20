const js = require("@eslint/js");
const globals = require("globals");
const { defineConfig, globalIgnores } = require("eslint/config");

module.exports = defineConfig([
  globalIgnores(["node_modules", "src/data"]),
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    files: ["**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: "module",
      globals: globals.node,
    },
  },
]);
