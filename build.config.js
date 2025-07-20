import { build } from "esbuild";
import { readdir, stat } from "fs/promises";
import { join, extname } from "path";

// Function to get all TypeScript files recursively
async function getTypeScriptFiles(dir) {
  const files = [];
  const items = await readdir(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      // Skip certain directories
      if (
        ["node_modules", "dist", "client", "migrations", ".git"].includes(item)
      ) {
        continue;
      }
      files.push(...(await getTypeScriptFiles(fullPath)));
    } else if (extname(item) === ".ts" || extname(item) === ".js") {
      files.push(fullPath);
    }
  }

  return files;
}

// Build configuration
const buildConfig = {
  entryPoints: ["server/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outdir: "dist",
  external: [
    // Node.js built-ins
    "fs",
    "path",
    "crypto",
    "http",
    "https",
    "url",
    "querystring",
    "os",
    "child_process",
    "cluster",
    "dgram",
    "dns",
    "net",
    "readline",
    "repl",
    "stream",
    "string_decoder",
    "tls",
    "tty",
    "util",
    "v8",
    "vm",
    "worker_threads",
    "zlib",
    "events",
    "assert",
    "buffer",
    "constants",
    "domain",
    "punycode",
    "timers",
    "tty",
    "querystring",

    // Common dependencies that should be external
    "express",
    "cors",
    "helmet",
    "morgan",
    "dotenv",
    "bcryptjs",
    "jsonwebtoken",
    "passport",
    "express-session",
    "express-rate-limit",
    "express-slow-down",
    "express-validator",
    "express-mongo-sanitize",
    "hpp",
    "memorystore",
    "connect-pg-simple",
    "ws",
    "pg",
    "drizzle-orm",
    "drizzle-orm/pg-core",
    "drizzle-zod",
    "zod",
    "@neondatabase/serverless",
    "stripe",
    "axios",
    "uuid",
    "date-fns",
    "i18n-iso-countries",
    "sitemap",

    // React and frontend dependencies (should not be bundled)
    "react",
    "react-dom",
    "@radix-ui/*",
    "framer-motion",
    "lucide-react",
    "react-hook-form",
    "@hookform/resolvers",
    "react-icons",
    "react-leaflet",
    "leaflet",
    "@vis.gl/react-google-maps",
    "@tanstack/react-query",
    "react-day-picker",
    "react-helmet-async",
    "react-resizable-panels",
    "react-swipeable",
    "react-zoom-pan-pinch",
    "recharts",
    "embla-carousel-react",
    "wouter",
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
    "tailwindcss-animate",
    "cmdk",
    "vaul",
    "input-otp",
    "@stripe/react-stripe-js",
    "@stripe/stripe-js",
    "recharts",
    "sitemap",

    // Vite and build tools
    "vite",
    "@vitejs/plugin-react",
    "autoprefixer",
    "postcss",
    "tailwindcss",
    "typescript",
    "ts-node",
    "tsx",
    "esbuild",
    "concurrently",
    "cross-env",
    "drizzle-kit",
    "@replit/*",
    "@tailwindcss/typography",

    // Development dependencies
    "@types/*",
    "bufferutil",
  ],
  sourcemap: false,
  minify: true,
  treeShaking: true,
  metafile: false,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  loader: {
    ".ts": "ts",
    ".js": "js",
  },
  plugins: [],
};

// Build function
async function buildServer() {
  try {
    console.log("Building server...");

    const result = await build({
      ...buildConfig,
      write: true,
      outdir: "dist",
      entryPoints: ["server/index.ts"],
    });

    if (result.errors.length > 0) {
      console.error("Build errors:", result.errors);
      process.exit(1);
    }

    console.log("Server build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

// Run build if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildServer();
}

export { buildServer, buildConfig };
