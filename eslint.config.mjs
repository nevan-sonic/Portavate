import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["**/.next/**", "**/next-env.d.ts", "**/coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
];
