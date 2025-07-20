import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http, { RequestOptions } from "http";
import https from "https";
import dotenv from "dotenv";
import morgan from "morgan";
import session from "express-session";
import path from "path";
import {
  securityHeaders,
  corsConfig,
  inputSanitization,
  requestLimits,
  securityLogger,
  secureErrorHandler,
  configureTrustedProxies,
  suspiciousActivitySlowDown,
} from "./middleware/security";
import {
  ipBlacklistMiddleware,
  suspiciousActivityMiddleware,
} from "./utils/rateLimiter";
import { getConfig, getSecurityRecommendations } from "./config/environment";

dotenv.config();

// Validate environment configuration on startup
const appConfig = getConfig();

// Display security recommendations for production
if (appConfig.isProduction) {
  const recommendations = getSecurityRecommendations();
  if (recommendations.length > 0) {
    recommendations.forEach((rec) => console.warn(`   - ${rec}`));
  }
}

const app = express();

// Debug environment detection
console.log("🔍 Environment detection:");
console.log("   - NODE_ENV:", process.env.NODE_ENV);
console.log("   - appConfig.isDevelopment:", appConfig.isDevelopment);
console.log("   - appConfig.isProduction:", appConfig.isProduction);
console.log("   - app.get('env'):", app.get("env"));

// Security configuration already loaded as appConfig

// Configure trusted proxies first
app.use(configureTrustedProxies());

// Security headers - apply first
app.use(securityHeaders());

// CORS configuration
app.use(corsConfig());

// Security logging - monitor suspicious activity
app.use(securityLogger);

// Slow down suspicious requests
app.use(suspiciousActivitySlowDown);

// Request logging with morgan (in development)
if (appConfig.isDevelopment) {
  app.use(morgan("combined"));
} else {
  // In production, use a more compact format
  app.use(morgan("common"));
}

// Request size limits
app.use(requestLimits());

// Body parsing with size limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Input sanitization and protection
app.use(inputSanitization());

// Session configuration with secure settings
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-fallback-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: !appConfig.isDevelopment, // HTTPS only in production
      httpOnly: true, // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "strict", // CSRF protection
    },
    name: "sessionId", // Don't use default session name
  })
);

// Log full url:
app.use((req: Request, _res: Response, next: NextFunction) => {
  const fullUrl = `${req.method}: ${req.protocol}://${req.get("host")}${
    req.originalUrl
  }`;

  // Only log in development to avoid log pollution
  if (appConfig.isDevelopment) {
    console.log("[request] Full URL:", fullUrl);
  }
  next();
});

// Rate limiting error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.status === 429) {
    return res.status(429).json({
      error: err.message || "Rate limit exceeded.",
      retryAfter: err.retryAfter || 900, // 15 minutes default
    });
  }
  next(err);
});

// Log all external requests from server side (with security filtering):
const originalHttpRequest = http.request;
(http as any).request = function (
  url: string | URL | RequestOptions,
  options?: RequestOptions | ((res: http.IncomingMessage) => void),
  callback?: (res: http.IncomingMessage) => void
) {
  const method =
    typeof url === "object" && "method" in url ? url.method : "GET";
  let fullUrl = "";

  if (typeof url === "string") {
    fullUrl = url;
  } else if (url instanceof URL) {
    fullUrl = url.href;
  } else if (typeof url === "object") {
    fullUrl = `${url.protocol || "http:"}//${url.hostname}${url.path || ""}`;
  }

  // Filter sensitive URLs from logs
  const sensitivePatterns = [/api[_-]?key/i, /token/i, /password/i, /secret/i];

  const isSensitive = sensitivePatterns.some((pattern) =>
    pattern.test(fullUrl)
  );

  if (!isSensitive || appConfig.isDevelopment) {
    console.log(`[outgoing request] ${method} ${fullUrl}`);
  } else {
    console.log(`[outgoing request] ${method} [REDACTED_SENSITIVE_URL]`);
  }

  return (originalHttpRequest as any).apply(http, arguments);
};

const originalHttpsRequest = https.request;
(https as any).request = function (
  url: string | URL | RequestOptions,
  options?: RequestOptions | ((res: http.IncomingMessage) => void),
  callback?: (res: http.IncomingMessage) => void
) {
  const method =
    typeof url === "object" && "method" in url ? url.method : "GET";
  let fullUrl = "";

  if (typeof url === "string") {
    fullUrl = url;
  } else if (url instanceof URL) {
    fullUrl = url.href;
  } else if (typeof url === "object") {
    fullUrl = `${url.protocol || "https:"}//${url.hostname}${url.path || ""}`;
  }

  // Filter sensitive URLs from logs
  const sensitivePatterns = [/api[_-]?key/i, /token/i, /password/i, /secret/i];

  const isSensitive = sensitivePatterns.some((pattern) =>
    pattern.test(fullUrl)
  );

  if (!isSensitive || appConfig.isDevelopment) {
    console.log(`[outgoing request] ${method} ${fullUrl}`);
  } else {
    console.log(`[outgoing request] ${method} [REDACTED_SENSITIVE_URL]`);
  }

  return (originalHttpsRequest as any).apply(https, arguments);
};

// Request/Response logging middleware with security filtering
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      // Filter sensitive data from response logs
      if (capturedJsonResponse) {
        const filteredResponse = { ...capturedJsonResponse };

        // Remove sensitive fields
        const sensitiveFields = [
          "password",
          "token",
          "secret",
          "key",
          "authorization",
        ];
        sensitiveFields.forEach((field) => {
          if (filteredResponse[field]) {
            filteredResponse[field] = "[REDACTED]";
          }
        });

        logLine += ` :: ${JSON.stringify(filteredResponse)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log("🚀 Starting server initialization...");

    const server = await registerRoutes(app);

    // Apply secure error handler at the end
    app.use(secureErrorHandler);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes

    // Explicitly check environment instead of relying on app.get("env")
    if (appConfig.isDevelopment) {
      // Check if running in separated development mode
      const separatedDev =
        process.env.NODE_ENV === "development" && !process.env.INTEGRATED_DEV;

      if (separatedDev) {
        log(
          "Running in separated development mode - API server only",
          "server"
        );
        // Don't setup Vite, just run as API server
      } else {
        log(
          "Running in integrated development mode - API server + Vite",
          "server"
        );
        await setupVite(app, server);
      }
    } else {
      log("Running in production mode - serving static files", "server");
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);

    server
      .listen(
        {
          port,
          host: "0.0.0.0",
          // reusePort: true,
        },
        () => {
          log(`🚀 Server running on port ${port}`);
          log(
            `🔒 Security features enabled: ${
              !appConfig.isDevelopment ? "PRODUCTION" : "DEVELOPMENT"
            } mode`
          );
          log(`🌐 CORS origins: ${appConfig.cors.origins.join(", ")}`);
          log(
            `📁 Static files will be served from: ${path.resolve(
              import.meta.dirname,
              "..",
              "dist",
              "public"
            )}`
          );
        }
      )
      .on("error", (err) => {
        console.error(
          `❌ Failed to start server on port ${port}:`,
          err.message
        );
        console.error(err);
        console.error(
          "💥 Server startup failed - this might cause the deployment platform to serve static files instead"
        );
        process.exit(1);
      });

    // Graceful shutdown handling
    process.on("SIGTERM", () => {
      console.log("🛑 SIGTERM received, shutting down gracefully");
      server.close(() => {
        console.log("💤 Process terminated");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("🛑 SIGINT received, shutting down gracefully");
      server.close(() => {
        console.log("💤 Process terminated");
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      console.error("💥 Uncaught Exception:", err);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  } catch (error) {
    console.error("💥 Failed to initialize server:", error);
    console.error(
      "💥 This might cause the deployment platform to serve static files instead"
    );
    process.exit(1);
  }
})();
