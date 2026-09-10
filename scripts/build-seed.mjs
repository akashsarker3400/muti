/**
 * Bundles prisma/seed.ts into a single ESM file so the runtime image can run
 * the seed with plain `node` — no TypeScript loader needed in production.
 *
 * Native / engine-backed packages stay external and are resolved from the
 * standalone build's node_modules at runtime.
 */
import { build } from "esbuild";

await build({
  entryPoints: ["prisma/seed.ts"],
  outfile: "prisma/seed.mjs",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  external: ["@prisma/client", "@prisma/adapter-pg", "pg", "pg-native"],
  // dotenv and the Prisma client internals use require() at runtime.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
  logLevel: "warning",
});

console.log("Bundled prisma/seed.ts -> prisma/seed.mjs");
