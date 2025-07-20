#!/usr/bin/env node

import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import { join } from "path";

console.log("🧪 Testing build process...");

// Clean previous builds
if (existsSync("dist")) {
  console.log("🧹 Cleaning previous build...");
  rmSync("dist", { recursive: true, force: true });
}

// Build the application
console.log("🔨 Building application...");
try {
  execSync("npm run build:production", { stdio: "inherit" });
  console.log("✅ Build completed successfully");
} catch (error) {
  console.error("❌ Build failed");
  process.exit(1);
}

// Verify build output
console.log("🔍 Verifying build output...");
const distPath = join(process.cwd(), "dist");
const indexPath = join(distPath, "index.js");
const publicPath = join(distPath, "public");
const publicIndexPath = join(publicPath, "index.html");

if (!existsSync(indexPath)) {
  console.error("❌ Server build output not found");
  process.exit(1);
}

if (!existsSync(publicPath)) {
  console.error("❌ Client build output not found");
  process.exit(1);
}

if (!existsSync(publicIndexPath)) {
  console.error("❌ Client index.html not found");
  process.exit(1);
}

console.log("✅ Build verification passed");
console.log("📁 Build output:");
console.log(`   - Server: ${indexPath}`);
console.log(`   - Client: ${publicPath}/`);
console.log(`   - Client index.html: ${publicIndexPath}`);

// Test server startup (optional)
console.log("🚀 Testing server startup...");
try {
  const server = execSync("cd dist && timeout 10s npm start", {
    stdio: "pipe",
    encoding: "utf8",
  });
  console.log("✅ Server started successfully");
} catch (error) {
  if (error.status === 124) {
    console.log("✅ Server started (timeout after 10s - this is expected)");
  } else {
    console.error("❌ Server failed to start:", error.message);
    console.error("This might be the cause of your deployment issue");
  }
}

console.log("🎉 Build test completed!");
