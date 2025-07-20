#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import { join } from "path";

console.log("🚀 Starting deployment process...");

// Clean previous builds
if (existsSync("dist")) {
  console.log("🧹 Cleaning previous build...");
  rmSync("dist", { recursive: true, force: true });
}

// Run type checking
console.log("🔍 Running type checks...");
try {
  execSync("npm run type-check", { stdio: "inherit" });
  console.log("✅ Type checks passed");
} catch (error) {
  console.error("❌ Type checks failed");
  process.exit(1);
}

// Build client
console.log("🔨 Building client...");
try {
  execSync("npm run build:client", { stdio: "inherit" });
  console.log("✅ Client build completed");
} catch (error) {
  console.error("❌ Client build failed");
  process.exit(1);
}

// Build server
console.log("🔨 Building server...");
try {
  execSync("node esbuild.config.js", { stdio: "inherit" });
  console.log("✅ Server build completed");
} catch (error) {
  console.error("❌ Server build failed");
  process.exit(1);
}

// Verify build output
console.log("🔍 Verifying build output...");
const distPath = join(process.cwd(), "dist");
const indexPath = join(distPath, "index.js");
const publicPath = join(distPath, "public");

if (!existsSync(indexPath)) {
  console.error("❌ Server build output not found");
  process.exit(1);
}

if (!existsSync(publicPath)) {
  console.error("❌ Client build output not found");
  process.exit(1);
}

console.log("✅ Build verification passed");

// Create production package.json
console.log("📝 Creating production package.json...");
const packageJson = JSON.parse(
  await import("fs/promises").then((fs) => fs.readFile("package.json", "utf8"))
);

const productionPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: packageJson.type,
  scripts: {
    start: "cross-env NODE_ENV=production node index.js",
  },
  dependencies: packageJson.dependencies,
  optionalDependencies: packageJson.optionalDependencies,
};

await import("fs/promises").then((fs) =>
  fs.writeFile(
    join(distPath, "package.json"),
    JSON.stringify(productionPackageJson, null, 2)
  )
);

console.log("✅ Deployment build completed successfully!");
console.log("");
console.log("📦 Build output: dist/");
console.log("📁 Files:");
console.log(`   - ${indexPath}`);
console.log(`   - ${publicPath}/`);
console.log(`   - ${join(distPath, "package.json")}`);
console.log("");
console.log("🚀 To deploy:");
console.log("   1. Upload the dist/ folder to your server");
console.log("   2. Run: cd dist && npm install --production");
console.log("   3. Run: npm start");
console.log("");
console.log("🌐 For Vercel deployment:");
console.log("   - Build Command: npm run build:production");
console.log("   - Output Directory: dist");
console.log("   - Install Command: npm install");
