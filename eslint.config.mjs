import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/api/**/*.ts", "lib/server/**/*.ts"],
    rules: {
      "react/display-name": "off",
      "react/prop-types": "off",
    },
  },
  {
    // 视频源海报域名不固定，使用原生 img 避免 next/image 远程域名配置限制
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".vercel/**",
    "next-env.d.ts",
    // 独立的严格验证链路，使用自身依赖，不参与应用 lint
    "verification/**",
  ]),
]);

export default eslintConfig;
