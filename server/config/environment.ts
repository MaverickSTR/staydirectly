// server/config/environment.ts
import { z } from "zod";
import crypto from "crypto";

// Environment schema validation
const environmentSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().regex(/^\d+$/).transform(Number).default("5000"),
  APP_ENV: z.enum(["development", "production", "test"]).optional(),

  // Database
  DATABASE_URL: z.string().url().optional(),
  PG_HOST: z.string().optional(),
  PG_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  PG_DATABASE: z.string().optional(),
  PG_USER: z.string().optional(),
  PG_PASSWORD: z.string().optional(),

  // Security
  JWT_SECRET: z.string().min(32).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  CSRF_SECRET: z.string().min(32).optional(),
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // API Keys
  HOSPITABLE_PLATFORM_TOKEN: z.string().min(1),
  HOSPITABLE_CLIENT_SECRET: z.string().optional(),
  HOSPITABLE_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().optional(),

  // Public environment variables
  NEXT_PUBLIC_HOSPITABLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_HOSPITABLE_REDIRECT_URI: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),

  // Admin access
  ADMIN_API_KEY: z.string().min(32).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default("900000"), // 15 minutes
  RATE_LIMIT_MAX: z.string().regex(/^\d+$/).transform(Number).default("100"),

  // CORS
  CORS_ORIGINS: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FILE_PATH: z.string().optional(),

  // Feature flags
  ENABLE_API_DOCS: z
    .string()
    .transform((s) => s === "true")
    .default("true"),
  ENABLE_WEBHOOKS: z
    .string()
    .transform((s) => s === "true")
    .default("true"),
  ENABLE_RATE_LIMITING: z
    .string()
    .transform((s) => s === "true")
    .default("true"),
  ENABLE_SECURITY_HEADERS: z
    .string()
    .transform((s) => s === "true")
    .default("true"),
});

// Extended validation for production environment
const productionRequiredFields = [
  "JWT_SECRET",
  "SESSION_SECRET",
  "HOSPITABLE_WEBHOOK_SECRET",
  "DATABASE_URL",
];

interface SecurityConfig {
  jwtSecret: string;
  sessionSecret: string;
  csrfSecret: string;
  encryptionKey: string;
}

interface DatabaseConfig {
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

interface AppConfig {
  nodeEnv: "development" | "production" | "test";
  port: number;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  security: SecurityConfig;
  database: DatabaseConfig;
  apiKeys: {
    hospitable: string;
    google: string;
    stripe?: string;
  };
  cors: {
    origins: string[];
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  features: {
    apiDocs: boolean;
    webhooks: boolean;
    rateLimiting: boolean;
    securityHeaders: boolean;
  };
}

// Generate secure random strings for missing secrets
const generateSecret = (length: number = 64): string => {
  return crypto.randomBytes(length).toString("hex");
};

// Parse and validate CORS origins
const parseCorsOrigins = (corsOriginsEnv?: string): string[] => {
  if (!corsOriginsEnv) {
    return process.env.NODE_ENV === "production"
      ? ["https://staydirectly.com", "https://www.staydirectly.com"]
      : [
          "http://localhost:3000",
          "http://localhost:5000",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:5000",
        ];
  }

  return corsOriginsEnv
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

// Validate environment variables
export const validateEnvironment = (): AppConfig => {
  try {
    // Parse environment variables
    const env = environmentSchema.parse(process.env);

    // Additional validation for production
    if (env.NODE_ENV === "production") {
      const missingProduction = productionRequiredFields.filter(
        (field) => !process.env[field]
      );

      if (missingProduction.length > 0) {
        console.error("❌ Missing required production environment variables:");
        missingProduction.forEach((field) => {
          console.error(`   ${field} is required in production`);
        });

        throw new Error(
          `Missing required production environment variables: ${missingProduction.join(
            ", "
          )}`
        );
      }
    }

    // Generate missing secrets with warnings
    const security: SecurityConfig = {
      jwtSecret:
        env.JWT_SECRET ||
        (() => {
          const secret = generateSecret(32);
          if (env.NODE_ENV === "production") {
            throw new Error("JWT_SECRET is required in production");
          }
          console.warn(
            "⚠️  JWT_SECRET not provided, generated temporary secret for development"
          );
          return secret;
        })(),

      sessionSecret:
        env.SESSION_SECRET ||
        (() => {
          const secret = generateSecret(32);
          if (env.NODE_ENV === "production") {
            throw new Error("SESSION_SECRET is required in production");
          }
          console.warn(
            "⚠️  SESSION_SECRET not provided, generated temporary secret for development"
          );
          return secret;
        })(),

      csrfSecret: env.CSRF_SECRET || generateSecret(32),
      encryptionKey: env.ENCRYPTION_KEY || generateSecret(32),
    };

    // Database configuration
    const database: DatabaseConfig = {
      url: env.DATABASE_URL,
      host: env.PG_HOST,
      port: env.PG_PORT,
      database: env.PG_DATABASE,
      user: env.PG_USER,
      password: env.PG_PASSWORD,
    };

    // Validate database configuration
    if (
      !database.url &&
      (!database.host || !database.database || !database.user)
    ) {
      const missing = [];
      if (!database.host) missing.push("PG_HOST");
      if (!database.database) missing.push("PG_DATABASE");
      if (!database.user) missing.push("PG_USER");

      throw new Error(
        `Database configuration incomplete. Either provide DATABASE_URL or all of: ${missing.join(
          ", "
        )}`
      );
    }

    const config: AppConfig = {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      isDevelopment: env.NODE_ENV === "development",
      isProduction: env.NODE_ENV === "production",
      isTest: env.NODE_ENV === "test",
      security,
      database,
      apiKeys: {
        hospitable: env.HOSPITABLE_PLATFORM_TOKEN,
        google: env.GOOGLE_API_KEY,
        stripe: env.STRIPE_SECRET_KEY,
      },
      cors: {
        origins: parseCorsOrigins(env.CORS_ORIGINS),
      },
      rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX,
      },
      features: {
        apiDocs: env.ENABLE_API_DOCS,
        webhooks: env.ENABLE_WEBHOOKS,
        rateLimiting: env.ENABLE_RATE_LIMITING,
        securityHeaders: env.ENABLE_SECURITY_HEADERS,
      },
    };

    // Log configuration summary
    console.log("🔧 Environment configuration loaded:");
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Port: ${config.port}`);
    console.log(
      `   Database: ${
        config.database.url ? "URL provided" : "Individual params"
      }`
    );
    console.log(`   CORS Origins: ${config.cors.origins.join(", ")}`);
    console.log(
      `   Rate Limiting: ${
        config.features.rateLimiting ? "Enabled" : "Disabled"
      }`
    );
    console.log(
      `   Security Headers: ${
        config.features.securityHeaders ? "Enabled" : "Disabled"
      }`
    );

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:");
      error.errors.forEach((err) => {
        console.error(`   ${err.path.join(".")}: ${err.message}`);
      });
    } else {
      console.error(
        "❌ Environment validation error:",
        (error as Error).message
      );
    }

    process.exit(1);
  }
};

// Environment validation for specific services
export const validateServiceConfig = (
  service: "hospitable" | "google" | "stripe" | "database"
) => {
  const config = validateEnvironment();

  switch (service) {
    case "hospitable":
      if (!config.apiKeys.hospitable) {
        throw new Error(
          "Hospitable API configuration is incomplete. HOSPITABLE_PLATFORM_TOKEN is required."
        );
      }
      break;

    case "google":
      if (!config.apiKeys.google) {
        throw new Error(
          "Google API configuration is incomplete. GOOGLE_API_KEY is required."
        );
      }
      break;

    case "stripe":
      if (!config.apiKeys.stripe) {
        throw new Error(
          "Stripe API configuration is incomplete. STRIPE_SECRET_KEY is required."
        );
      }
      break;

    case "database":
      if (
        !config.database.url &&
        (!config.database.host || !config.database.database)
      ) {
        throw new Error("Database configuration is incomplete.");
      }
      break;

    default:
      throw new Error(`Unknown service: ${service}`);
  }

  return config;
};

// Security recommendations
export const getSecurityRecommendations = (): string[] => {
  const recommendations: string[] = [];
  const config = validateEnvironment();

  if (config.isProduction) {
    if (!process.env.JWT_SECRET) {
      recommendations.push("Set JWT_SECRET environment variable");
    }

    if (!process.env.SESSION_SECRET) {
      recommendations.push("Set SESSION_SECRET environment variable");
    }

    if (!process.env.HOSPITABLE_WEBHOOK_SECRET) {
      recommendations.push(
        "Set HOSPITABLE_WEBHOOK_SECRET for webhook verification"
      );
    }

    if (!process.env.CSRF_SECRET) {
      recommendations.push("Set CSRF_SECRET for CSRF protection");
    }

    if (config.cors.origins.includes("*")) {
      recommendations.push(
        "Configure specific CORS origins instead of wildcard"
      );
    }

    if (!process.env.ADMIN_API_KEY) {
      recommendations.push("Set ADMIN_API_KEY for admin access");
    }
  }

  return recommendations;
};

// Create .env template
export const generateEnvTemplate = (): string => {
  return `# StayDirectly Backend Environment Configuration

# Application
NODE_ENV=development
PORT=5000
APP_ENV=development

# Database (use either DATABASE_URL or individual PG_* variables)
DATABASE_URL=postgresql://postgres:password@localhost:5432/staydirectly_dev
# PG_HOST=localhost
# PG_PORT=5432
# PG_DATABASE=staydirectly_dev
# PG_USER=postgres
# PG_PASSWORD=your_password_here

# Security (generate secure random strings for production)
JWT_SECRET=${generateSecret(32)}
SESSION_SECRET=${generateSecret(32)}
CSRF_SECRET=${generateSecret(32)}
ENCRYPTION_KEY=${generateSecret(32)}

# Required API Keys
HOSPITABLE_PLATFORM_TOKEN=your_hospitable_platform_token_here
GOOGLE_API_KEY=your_google_api_key_here

# Optional API Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
HOSPITABLE_CLIENT_SECRET=your_hospitable_client_secret_here
HOSPITABLE_WEBHOOK_SECRET=${generateSecret(32)}

# Public Environment Variables (safe to expose to client)
NEXT_PUBLIC_HOSPITABLE_CLIENT_ID=your_hospitable_client_id_here
NEXT_PUBLIC_HOSPITABLE_REDIRECT_URI=http://localhost:5000/auth/callback
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Admin Access
ADMIN_API_KEY=${generateSecret(32)}
ADMIN_EMAIL=admin@staydirectly.com
ADMIN_PASSWORD=secure_admin_password_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# CORS (comma-separated list of allowed origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:5000

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# Feature Flags
ENABLE_API_DOCS=true
ENABLE_WEBHOOKS=true
ENABLE_RATE_LIMITING=true
ENABLE_SECURITY_HEADERS=true
`;
};

// Export the configuration singleton
let appConfig: AppConfig | null = null;

export const getConfig = (): AppConfig => {
  if (!appConfig) {
    appConfig = validateEnvironment();
  }
  return appConfig;
};

export type { AppConfig, SecurityConfig, DatabaseConfig };
