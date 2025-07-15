// server/middleware/security.ts
import helmet from "helmet";
import cors from "cors";
import { body, query, param, validationResult } from "express-validator";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import crypto from "crypto";
import { z } from "zod";

// Security configuration interface
interface SecurityConfig {
  isDevelopment: boolean;
  allowedOrigins: string[];
  trustedProxies: string[];
  csrfSecret?: string;
}

// Default security configuration
const getSecurityConfig = (): SecurityConfig => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return {
    isDevelopment,
    allowedOrigins: isDevelopment
      ? [
          "http://localhost:5173",
          "http://localhost:5000",
          "http://127.0.0.1:5173",
          "http://127.0.0.1:5000",
        ]
      : ["https://staydirectly.com", "https://www.staydirectly.com"],
    trustedProxies: ["127.0.0.1", "::1"], // Add your proxy IPs here
    csrfSecret:
      process.env.CSRF_SECRET || crypto.randomBytes(32).toString("hex"),
  };
};

// Security headers middleware using helmet
export const securityHeaders = () => {
  const config = getSecurityConfig();

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Only in development
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://js.stripe.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:",
          "https://*.googleusercontent.com",
          "https://*.muscache.com",
          "https://*.airbnbstatic.com",
        ],
        connectSrc: [
          "'self'",
          "https://api.staydirectly.com",
          "https://connect.hospitable.com",
          "https://places.googleapis.com",
          "https://maps.googleapis.com",
          "https://api.stripe.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:"],
        frameSrc: [
          "'self'",
          "https://js.stripe.com",
          "https://hooks.stripe.com",
        ],
      },
    },

    // Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // X-Frame-Options
    frameguard: { action: "deny" },

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },

    // Don't infer MIME type
    crossOriginEmbedderPolicy: false, // Disable for external images

    // Permission Policy
    permittedCrossDomainPolicies: false,
  });
};

// CORS configuration middleware
export const corsConfig = () => {
  const config = getSecurityConfig();

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, be more permissive
      if (
        config.isDevelopment &&
        (origin.includes("localhost") || origin.includes("127.0.0.1"))
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS policy"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "X-API-Key",
      "X-Forwarded-For",
      "X-Real-IP",
    ],
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
    maxAge: 86400, // 24 hours
  });
};

// Input sanitization middleware
export const inputSanitization = () => {
  return [
    // Remove any keys that start with '$' or contain '.'
    mongoSanitize({
      replaceWith: "_",
      onSanitize: ({ req, key }) => {
        console.warn(
          `Sanitized potentially dangerous key: ${key} in request to ${req.path}`
        );
      },
    }),

    // Protect against HTTP Parameter Pollution
    hpp({
      whitelist: ["sort", "limit", "offset", "filter", "fields", "amenities"], // Allow arrays for these parameters
    }),
  ];
};

// Request size limits middleware
export const requestLimits = () => {
  return [
    // JSON body limit
    (req: Request, res: Response, next: NextFunction) => {
      if (req.headers["content-type"]?.includes("application/json")) {
        const maxSize = 1024 * 1024; // 1MB
        if (
          req.headers["content-length"] &&
          parseInt(req.headers["content-length"]) > maxSize
        ) {
          return res.status(413).json({
            error: "Request entity too large",
            maxSize: "1MB",
          });
        }
      }
      next();
    },
  ];
};

// API Key authentication middleware
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"] as string;
  const authHeader = req.headers.authorization;

  // Extract API key from Authorization header if present
  let extractedApiKey = apiKey;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    extractedApiKey = authHeader.substring(7);
  }

  // Skip API key validation for public endpoints
  const publicPaths = [
    "/api/properties",
    "/api/cities",
    "/api/auth/hospitable/token",
    "/api/auth/hospitable/refresh",
    "/api/auth/hospitable/user",
    "/robots.txt",
    "/sitemap.xml",
    "/webhook/",
  ];

  const isPublicPath = publicPaths.some((path) => req.path.startsWith(path));
  if (isPublicPath || req.method === "GET") {
    return next();
  }

  // For protected endpoints, require API key
  if (!extractedApiKey) {
    return res.status(401).json({
      error: "API key required",
      message:
        "Please provide an API key in X-API-Key header or Authorization Bearer token",
    });
  }

  // Validate API key format (you can implement more sophisticated validation)
  if (extractedApiKey.length < 32) {
    return res.status(401).json({
      error: "Invalid API key format",
    });
  }

  // Store API key in request for rate limiting
  req.user = { id: extractedApiKey };
  next();
};

// Enhanced brute force protection
export const bruteForceProtection = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Combine IP and potential user identifier
    const userKey =
      req.headers["x-api-key"] || req.body?.email || req.body?.username || "";
    return `${req.ip}:${userKey}`;
  },
  handler: (req, res) => {
    console.warn(`Brute force attempt detected from ${req.ip} for ${req.path}`);
    res.status(429).json({
      error: "Too many failed attempts",
      message: "Account temporarily locked. Please try again later.",
      retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
    });
  },
});

// Slow down middleware for suspicious activity
export const suspiciousActivitySlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // Allow 10 requests per windowMs without delay
  delayMs: (used) => (used - 10) * 500, // Add 500ms delay for each request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
});

// Input validation helpers
export const validateRequiredEnvVars = () => {
  const requiredVars = [
    "NODE_ENV",
    "HOSPITABLE_PLATFORM_TOKEN",
    "GOOGLE_API_KEY",
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
};

// Secure error handler
export const secureErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the full error for debugging
  console.error("Error occurred:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    timestamp: new Date().toISOString(),
  });

  // Determine error type and status
  let status = err.status || err.statusCode || 500;
  let message = "Internal server error";

  // Handle specific error types
  if (err.name === "ValidationError") {
    status = 400;
    message = "Invalid input data";
  } else if (err.name === "UnauthorizedError") {
    status = 401;
    message = "Authentication required";
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID format";
  } else if (err.code === 11000) {
    status = 409;
    message = "Resource already exists";
  } else if (status === 429) {
    message = err.message || "Rate limit exceeded";
  } else if (status >= 400 && status < 500) {
    message = err.message || "Bad request";
  }

  // In development, include more details
  const response: any = {
    error: message,
    status: status,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "development") {
    response.details = err.message;
    response.path = req.path;
  }

  res.status(status).json(response);
};

// Security logging middleware
export const securityLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Log security-relevant events
  const securityEvents = {
    suspiciousUserAgent: /bot|crawler|spider|scraper/i.test(
      req.headers["user-agent"] || ""
    ),
    unusualMethod: ![
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ].includes(req.method),
    noUserAgent: !req.headers["user-agent"],
    sqlInjectionAttempt:
      /(\b(union|select|insert|delete|drop|create|alter|exec|execute)\b)/i.test(
        req.url
      ),
    xssAttempt: /<script|javascript:|data:text\/html/i.test(req.url),
    pathTraversal: /\.\.|\/etc\/|\/var\/|\/proc\//i.test(req.url),
  };

  const hasSecurityEvent = Object.values(securityEvents).some(Boolean);

  if (hasSecurityEvent) {
    console.warn("Security event detected:", {
      ip: req.ip,
      method: req.method,
      path: req.path,
      userAgent: req.headers["user-agent"],
      events: Object.entries(securityEvents)
        .filter(([_, value]) => value)
        .map(([key]) => key),
      timestamp: new Date().toISOString(),
    });
  }

  // Continue with request
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    // Log slow requests (potential DoS attempts)
    if (duration > 5000) {
      console.warn("Slow request detected:", {
        ip: req.ip,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        status: res.statusCode,
      });
    }
  });

  next();
};

// Validation result checker
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((err) => ({
        field: err.type === "field" ? err.path : "unknown",
        message: err.msg,
        value: err.type === "field" ? err.value : undefined,
      })),
    });
  }
  next();
};

// Zod validation middleware factory
export const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = { ...req.body, ...req.query, ...req.params };
      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
          })),
        });
      }
      next(error);
    }
  };
};

// Trust proxy configuration
export const configureTrustedProxies = () => {
  const config = getSecurityConfig();
  return (req: Request, res: Response, next: NextFunction) => {
    // Set trusted proxy IPs for accurate IP detection
    req.app.set("trust proxy", config.trustedProxies);
    next();
  };
};

export { getSecurityConfig };
