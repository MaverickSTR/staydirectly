import { build } from "esbuild";
import { rm, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

async function buildProduction() {
  console.log("🚀 Starting production build...");

  // Clean dist directory
  if (existsSync("dist")) {
    console.log("🧹 Cleaning dist directory...");
    await rm("dist", { recursive: true, force: true });
  }

  // Create dist directory
  await mkdir("dist", { recursive: true });

  // Build server
  console.log("🔨 Building server...");
  const serverResult = await build({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "esm",
    outfile: "dist/index.js",
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

      // All npm packages should be external
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

      // React and frontend dependencies
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

      // Build tools
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

      // Dev dependencies
      "@types/*",
      "bufferutil",
    ],
    sourcemap: false,
    minify: true,
    treeShaking: true,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    loader: {
      ".ts": "ts",
      ".js": "js",
    },
  });

  if (serverResult.errors.length > 0) {
    console.error("❌ Server build errors:", serverResult.errors);
    process.exit(1);
  }

  console.log("✅ Server build completed!");

  // Build client
  console.log("🔨 Building client...");
  const { execSync } = await import("child_process");

  try {
    execSync("npm run build:client", { stdio: "inherit" });
    console.log("✅ Client build completed!");
  } catch (error) {
    console.error("❌ Client build failed:", error);
    process.exit(1);
  }

  // Copy necessary files to dist
  console.log("📁 Copying necessary files...");

  // Copy package.json for production dependencies
  const { copyFile } = await import("fs/promises");
  await copyFile("package.json", "dist/package.json");

  // Create a production package.json with only production dependencies
  const packageJson = JSON.parse(
    await import("fs/promises").then((fs) =>
      fs.readFile("package.json", "utf8")
    )
  );
  const productionPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    scripts: {
      start: "node index.js",
    },
    dependencies: packageJson.dependencies,
    optionalDependencies: packageJson.optionalDependencies,
  };

  await import("fs/promises").then((fs) =>
    fs.writeFile(
      "dist/package.json",
      JSON.stringify(productionPackageJson, null, 2)
    )
  );

  console.log("✅ Production build completed successfully!");
  console.log("📦 Build output: dist/");
  console.log("🚀 To start: cd dist && npm install && npm start");
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildProduction().catch(console.error);
}

export { buildProduction };
