// server/utils/rateLimiter.ts

import rateLimit, { Options as RateLimitOptions } from "express-rate-limit";
import slowDown from "express-slow-down";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";

// Extend Express Request type to include 'user' property
declare module "express-serve-static-core" {
  interface Request {
    user?: { id?: string };
    suspiciousActivity?: boolean;
  }
}

// In-memory stores for tracking
const suspiciousIPs = new Map<
  string,
  { count: number; lastSeen: Date; reasons: string[] }
>();
const rateLimitStore = new Map<string, { hits: number; resetTime: Date }>();
const blacklistedIPs = new Set<string>();

// Load blacklisted IPs from file (if exists)
const BLACKLIST_FILE = path.join(
  process.cwd(),
  "server",
  "data",
  "blacklisted-ips.json"
);
try {
  if (fs.existsSync(BLACKLIST_FILE)) {
    const data = JSON.parse(fs.readFileSync(BLACKLIST_FILE, "utf8"));
    data.forEach((ip: string) => blacklistedIPs.add(ip));
    console.log(`Loaded ${blacklistedIPs.size} blacklisted IPs`);
  }
} catch (error) {
  console.warn("Could not load blacklisted IPs:", error);
}

// Save blacklisted IPs to file
const saveBlacklist = () => {
  try {
    const dir = path.dirname(BLACKLIST_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      BLACKLIST_FILE,
      JSON.stringify([...blacklistedIPs], null, 2)
    );
  } catch (error) {
    console.error("Could not save blacklisted IPs:", error);
  }
};

// Clean up old entries periodically
setInterval(() => {
  const now = new Date();
  const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours

  // Clean suspicious IPs
  for (const [ip, data] of suspiciousIPs.entries()) {
    if (now.getTime() - data.lastSeen.getTime() > cleanupThreshold) {
      suspiciousIPs.delete(ip);
    }
  }

  // Clean rate limit store
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run every hour

// IP blacklist middleware
export const ipBlacklistMiddleware = (
  req: Request,
  res: Response,
  next: Function
) => {
  const clientIP = req.ip || req.connection.remoteAddress || "unknown";

  if (blacklistedIPs.has(clientIP)) {
    console.warn(`Blocked request from blacklisted IP: ${clientIP}`);
    return res.status(403).json({
      error: "Access denied",
      message: "Your IP address has been blocked due to suspicious activity",
    });
  }

  next();
};

// Enhanced key generator with user/session tracking
const enhancedKeyGenerator = (req: Request): string => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  const userId = req.user?.id;
  const sessionId = req.sessionID;

  // Create composite key for better tracking
  if (userId) {
    return `user:${userId}:${ip}`;
  } else if (sessionId) {
    return `session:${sessionId}:${ip}`;
  } else {
    return `ip:${ip}:${userAgent.substring(0, 50)}`;
  }
};

// Suspicious activity detector
const detectSuspiciousActivity = (req: Request): boolean => {
  const userAgent = req.headers["user-agent"] || "";
  const referer = req.headers.referer || "";
  const path = req.path;
  const method = req.method;

  const suspiciousPatterns = [
    // Bot patterns
    /bot|crawler|spider|scraper|automated/i.test(userAgent),

    // Security scan patterns
    /nmap|nikto|sqlmap|dirb|gobuster|nuclei/i.test(userAgent),

    // Injection attempts
    /(\b(union|select|insert|delete|drop|create|alter|exec|execute)\b)/i.test(
      req.url
    ),
    /<script|javascript:|data:text\/html/i.test(req.url),
    /\.\.|\/etc\/|\/var\/|\/proc\//i.test(req.url),

    // Method anomalies
    ["TRACE", "CONNECT", "DEBUG"].includes(method),

    // Missing or suspicious headers
    !userAgent || userAgent.length < 10,

    // Excessive path length
    path.length > 1000,

    // Common attack paths
    /\/(admin|wp-admin|phpmyadmin|administrator|config|backup|test|demo)/i.test(
      path
    ),
    /\.(env|config|backup|log|sql|db)$/i.test(path),
  ];

  return suspiciousPatterns.some(Boolean);
};

// Mark IP as suspicious
const markSuspiciousIP = (ip: string, reason: string) => {
  const existing = suspiciousIPs.get(ip) || {
    count: 0,
    lastSeen: new Date(),
    reasons: [],
  };
  existing.count++;
  existing.lastSeen = new Date();
  existing.reasons.push(reason);

  // Keep only last 10 reasons
  if (existing.reasons.length > 10) {
    existing.reasons = existing.reasons.slice(-10);
  }

  suspiciousIPs.set(ip, existing);

  // Auto-blacklist after 20 suspicious activities
  if (existing.count >= 20) {
    blacklistedIPs.add(ip);
    saveBlacklist();
    console.warn(
      `Auto-blacklisted IP ${ip} after ${
        existing.count
      } suspicious activities: ${existing.reasons.join(", ")}`
    );
  }
};

// Enhanced rate limiter factory
export const createEnhancedRateLimiter = (config: {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request) => void;
  adaptiveMultiplier?: number;
}) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: (req: Request) => {
      const baseLimit = config.max;
      const ip = req.ip || "unknown";

      // Reduce limit for suspicious IPs
      const suspiciousData = suspiciousIPs.get(ip);
      if (suspiciousData && suspiciousData.count > 5) {
        const reduction = Math.min(0.8, suspiciousData.count * 0.1);
        return Math.floor(baseLimit * (1 - reduction));
      }

      // Adaptive limits based on activity
      if (config.adaptiveMultiplier && req.suspiciousActivity) {
        return Math.floor(baseLimit * config.adaptiveMultiplier);
      }

      return baseLimit;
    },
    keyGenerator: config.keyGenerator || enhancedKeyGenerator,
    skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    handler: (req: Request, res: Response) => {
      const ip = req.ip || "unknown";

      // Mark as rate limited attempt
      markSuspiciousIP(ip, "rate_limit_exceeded");

      if (config.onLimitReached) {
        config.onLimitReached(req);
      }

      res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests from this client",
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Suspicious activity middleware
export const suspiciousActivityMiddleware = (
  req: Request,
  res: Response,
  next: Function
) => {
  const isSuspicious = detectSuspiciousActivity(req);

  if (isSuspicious) {
    req.suspiciousActivity = true;
    const ip = req.ip || "unknown";
    markSuspiciousIP(ip, "suspicious_request_pattern");

    console.warn(`Suspicious activity from ${ip}: ${req.method} ${req.path}`, {
      userAgent: req.headers["user-agent"],
      referer: req.headers.referer,
    });
  }

  next();
};

/**
 * Generic IP-based rate limiter
 * - Applies to general public routes
 */
export const generalRateLimiter = createEnhancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  skipSuccessfulRequests: true,
  adaptiveMultiplier: 0.5, // Reduce to 50% for suspicious activity
});

/**
 * Stricter rate limiter for sensitive routes (auth, API)
 */
export const strictRateLimiter = createEnhancedRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 requests per minute
  skipSuccessfulRequests: true,
  adaptiveMultiplier: 0.3, // Reduce to 30% for suspicious activity
});

/**
 * Authenticated user-based rate limiter
 * - Useful when there is need to limit based on user ID or API token
 */
export const userRateLimiter = createEnhancedRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50,
  keyGenerator: (req: Request): string => {
    // Use user ID or token if available, fallback to IP
    return (
      req.user?.id ||
      req.headers["x-api-key"]?.toString() ||
      req.ip ||
      "unknown"
    );
  },
  onLimitReached: (req: Request) => {
    const userKey = req.user?.id || req.headers["x-api-key"] || req.ip;
    console.warn(`User rate limit exceeded for: ${userKey}`);
  },
});

/**
 * Custom rate limiter factory with enhanced features
 */
export function createCustomRateLimiter(options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
  skipPaths?: string[];
  enableSlowDown?: boolean;
}) {
  const limiter = createEnhancedRateLimiter({
    windowMs: options.windowMs,
    max: options.max,
    keyGenerator: options.keyGenerator,
    adaptiveMultiplier: 0.4,
  });

  // Optional slow down middleware
  const slowDownMiddleware = options.enableSlowDown
    ? slowDown({
        windowMs: options.windowMs,
        delayAfter: Math.floor(options.max * 0.7), // Start slowing down at 70% of limit
        delayMs: (used: number, req: Request) => {
          const baseDelay = (used - Math.floor(options.max * 0.7)) * 100;
          return req.suspiciousActivity ? baseDelay * 2 : baseDelay;
        },
        maxDelayMs: 10000, // Max 10 seconds
      })
    : null;

  return (req: Request, res: Response, next: Function) => {
    // Skip certain paths if specified
    if (
      options.skipPaths &&
      options.skipPaths.some((path) => req.path.startsWith(path))
    ) {
      return next();
    }

    // Apply slow down first if enabled
    if (slowDownMiddleware) {
      slowDownMiddleware(req, res, (err?: any) => {
        if (err) return next(err);
        limiter(req, res, next);
      });
    } else {
      limiter(req, res, next);
    }
  };
}

// Login attempt rate limiter with account lockout protection
export const loginRateLimiter = createEnhancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  keyGenerator: (req: Request) => {
    const email = req.body?.email || req.body?.username || "";
    const ip = req.ip || "unknown";
    return `login:${email}:${ip}`;
  },
  onLimitReached: (req: Request) => {
    const email = req.body?.email || req.body?.username || "unknown";
    console.warn(
      `Login rate limit exceeded for email: ${email} from IP: ${req.ip}`
    );
  },
});

// Password reset rate limiter
export const passwordResetRateLimiter = createEnhancedRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  keyGenerator: (req: Request) => {
    const email = req.body?.email || "";
    return `password_reset:${email}`;
  },
});

// File upload rate limiter
export const uploadRateLimiter = createEnhancedRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  skipSuccessfulRequests: false,
});

// API endpoint specific limiters
export const searchRateLimiter = createCustomRateLimiter({
  windowMs: 30 * 1000, // 30 seconds
  max: 10,
  keyGenerator: (req) => `${req.ip}:search:${req.query.q || ""}`,
  message: "Too many search requests. Please wait a moment and try again.",
  enableSlowDown: true,
});

export const webhookRateLimiter = createEnhancedRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Allow more for legitimate webhooks
  keyGenerator: (req: Request) => {
    // Use a combination of IP and user agent for webhooks
    const userAgent = req.headers["user-agent"] || "";
    return `webhook:${req.ip}:${userAgent.substring(0, 20)}`;
  },
});

// Export utility functions
export const utils = {
  getBlacklistedIPs: () => [...blacklistedIPs],
  addToBlacklist: (ip: string) => {
    blacklistedIPs.add(ip);
    saveBlacklist();
  },
  removeFromBlacklist: (ip: string) => {
    blacklistedIPs.delete(ip);
    saveBlacklist();
  },
  getSuspiciousIPs: () => Object.fromEntries(suspiciousIPs),
  clearSuspiciousIP: (ip: string) => suspiciousIPs.delete(ip),
};
