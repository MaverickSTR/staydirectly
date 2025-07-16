import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Use async config function for conditional plugin
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      themePlugin(),
      ...(mode !== "production" && process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer()
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        // Client paths - matching TypeScript paths
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@/components": path.resolve(
          import.meta.dirname,
          "client",
          "src",
          "components"
        ),
        "@/pages": path.resolve(import.meta.dirname, "client", "src", "pages"),
        "@/hooks": path.resolve(import.meta.dirname, "client", "src", "hooks"),
        "@/lib": path.resolve(import.meta.dirname, "client", "src", "lib"),
        "@/types": path.resolve(
          import.meta.dirname,
          "client",
          "src",
          "types.ts"
        ),
        "@/ui": path.resolve(
          import.meta.dirname,
          "client",
          "src",
          "components",
          "ui"
        ),

        // Shared paths
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@shared/schema": path.resolve(
          import.meta.dirname,
          "shared",
          "schema.ts"
        ),
        "@shared/relations": path.resolve(
          import.meta.dirname,
          "shared",
          "relations.ts"
        ),

        // Assets
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    // Set root to client directory for proper path resolution
    root: path.resolve(import.meta.dirname, "client"),
    // Set public directory relative to root
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      // Ensure proper base path for built assets
      assetsDir: "assets",
    },
    define: {
      // 👇 This is the injection you need
      "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(
        env.VITE_GOOGLE_MAPS_API_KEY
      ),
      "import.meta.env.VITE_HOSPITABLE_CLIENT_TOKEN": JSON.stringify(
        env.VITE_HOSPITABLE_CLIENT_TOKEN
      ),
      "import.meta.env.VITE_HOSPITABLE_API_URL": JSON.stringify(
        env.VITE_HOSPITABLE_API_URL
      ),
    },
    optimizeDeps: {
      exclude: ["lucide-react"],
    },
    server: {
      // Use different port for Vite dev server to avoid conflicts
      port: 5173,

      // HOST OPTIONS - controls who can connect to your dev server
      host: true, // Current: allows external connections (0.0.0.0)
      // Alternative options:
      // host: 'localhost', // Only localhost access
      // host: '192.168.1.100', // Specific IP only

      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
      },

      // CORS OPTIONS - controls cross-origin requests
      cors: true, // Current: allows all origins
      // More specific CORS examples:
      // cors: {
      //   origin: ['http://localhost:3000', 'https://yourdomain.com'],
      //   credentials: true
      // },

      // CUSTOM HEADERS (if needed for additional security)
      // headers: {
      //   'X-Frame-Options': 'DENY',
      //   'X-Content-Type-Options': 'nosniff'
      // },
    },
    // Ensure proper base path
    base: "/",
  };
});
