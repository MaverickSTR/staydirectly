// server/routes/admin.ts
import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  authenticate,
  requireAdmin,
  requirePermission,
  Permission,
  UserRole,
  apiKeyManager,
  createApiKeySchema,
} from "../middleware/auth";
import {
  strictRateLimiter,
  loginRateLimiter,
  passwordResetRateLimiter,
  utils as rateLimitUtils,
} from "../utils/rateLimiter";
import { validateSchema, handleValidationErrors } from "../middleware/security";
import { getConfig, getSecurityRecommendations } from "../config/environment";

const router = Router();

// Apply authentication to all admin routes
router.use(authenticate);
router.use(requireAdmin);

// Apply strict rate limiting to admin routes
router.use(strictRateLimiter);

// Admin Dashboard - Get system status
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const config = getConfig();
    const securityRecommendations = getSecurityRecommendations();

    const systemStatus = {
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      security: {
        features: config.features,
        recommendations: securityRecommendations,
        lastSecurityCheck: new Date().toISOString(),
      },
      rateLimiting: {
        blacklistedIPs: rateLimitUtils.getBlacklistedIPs().length,
        suspiciousIPs: Object.keys(rateLimitUtils.getSuspiciousIPs()).length,
      },
      apiKeys: apiKeyManager.getStats(),
      server: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };

    res.json({
      success: true,
      data: systemStatus,
      message: "Admin dashboard data retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard data",
    });
  }
});

// API Key Management Routes

// List all API keys
router.get(
  "/api-keys",
  requirePermission(Permission.MANAGE_API_KEYS),
  async (req: Request, res: Response) => {
    try {
      const apiKeys = apiKeyManager.list();
      res.json({
        success: true,
        data: apiKeys,
        total: apiKeys.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch API keys",
      });
    }
  }
);

// Create new API key
router.post(
  "/api-keys",
  requirePermission(Permission.MANAGE_API_KEYS),
  validateSchema(createApiKeySchema),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { name, role, permissions, expiresInDays, allowedIPs, rateLimit } =
        req.body;

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const apiKey = apiKeyManager.create({
        name,
        role: role as UserRole,
        permissions,
        expiresAt,
        allowedIPs,
        rateLimit,
      });

      // Log the API key creation
      console.log(`Admin ${req.user?.id} created new API key: ${name}`);

      res.status(201).json({
        success: true,
        data: apiKey,
        message: "API key created successfully",
        warning: "Save the API key securely. It will not be shown again.",
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create API key",
      });
    }
  }
);

// Revoke API key
router.delete(
  "/api-keys/:keyId",
  requirePermission(Permission.MANAGE_API_KEYS),
  async (req: Request, res: Response) => {
    try {
      const { keyId } = req.params;

      // In a real implementation, you'd find the key by ID first
      // For now, we'll assume keyId is the actual key
      const success = apiKeyManager.revoke(keyId);

      if (success) {
        console.log(`Admin ${req.user?.id} revoked API key: ${keyId}`);
        res.json({
          success: true,
          message: "API key revoked successfully",
        });
      } else {
        res.status(404).json({
          success: false,
          error: "API key not found",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to revoke API key",
      });
    }
  }
);

// Security Management Routes

// Get security status
router.get("/security/status", async (req: Request, res: Response) => {
  try {
    const blacklistedIPs = rateLimitUtils.getBlacklistedIPs();
    const suspiciousIPs = rateLimitUtils.getSuspiciousIPs();
    const config = getConfig();
    const recommendations = getSecurityRecommendations();

    res.json({
      success: true,
      data: {
        blacklistedIPs: {
          count: blacklistedIPs.length,
          ips: blacklistedIPs.slice(0, 10), // Only show first 10 for brevity
        },
        suspiciousIPs: {
          count: Object.keys(suspiciousIPs).length,
          recent: Object.entries(suspiciousIPs)
            .sort(([, a], [, b]) => b.lastSeen.getTime() - a.lastSeen.getTime())
            .slice(0, 10)
            .map(([ip, data]) => ({
              ip,
              count: data.count,
              lastSeen: data.lastSeen,
              reasons: data.reasons.slice(-3), // Last 3 reasons
            })),
        },
        securityFeatures: config.features,
        recommendations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch security status",
    });
  }
});

// Blacklist management
const ipSchema = z.object({
  ip: z.string().ip("Invalid IP address"),
});

router.post(
  "/security/blacklist",
  validateSchema(ipSchema),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { ip } = req.body;

      rateLimitUtils.addToBlacklist(ip);
      console.log(`Admin ${req.user?.id} manually blacklisted IP: ${ip}`);

      res.json({
        success: true,
        message: `IP ${ip} has been blacklisted`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to blacklist IP",
      });
    }
  }
);

router.delete(
  "/security/blacklist/:ip",
  async (req: Request, res: Response) => {
    try {
      const { ip } = req.params;

      // Validate IP format
      const ipValidation = z.string().ip().safeParse(ip);
      if (!ipValidation.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid IP address format",
        });
      }

      rateLimitUtils.removeFromBlacklist(ip);
      console.log(`Admin ${req.user?.id} removed IP from blacklist: ${ip}`);

      res.json({
        success: true,
        message: `IP ${ip} has been removed from blacklist`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to remove IP from blacklist",
      });
    }
  }
);

// Clear suspicious IP record
router.delete(
  "/security/suspicious/:ip",
  async (req: Request, res: Response) => {
    try {
      const { ip } = req.params;

      const success = rateLimitUtils.clearSuspiciousIP(ip);

      if (success) {
        console.log(
          `Admin ${req.user?.id} cleared suspicious IP record: ${ip}`
        );
        res.json({
          success: true,
          message: `Suspicious activity record cleared for IP ${ip}`,
        });
      } else {
        res.status(404).json({
          success: false,
          error: "IP not found in suspicious activity records",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to clear suspicious IP record",
      });
    }
  }
);

// System Configuration Routes

// Get system configuration (read-only)
router.get("/config", async (req: Request, res: Response) => {
  try {
    const config = getConfig();

    // Return safe configuration (no secrets)
    const safeConfig = {
      environment: config.nodeEnv,
      features: config.features,
      rateLimit: config.rateLimit,
      cors: {
        origins: config.cors.origins,
      },
      database: {
        connected:
          !!config.database.url ||
          !!(config.database.host && config.database.database),
      },
    };

    res.json({
      success: true,
      data: safeConfig,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch configuration",
    });
  }
});

// Health check endpoint (less restrictive)
router.get("/health", async (req: Request, res: Response) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      environment: process.env.NODE_ENV || "development",
    };

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Health check failed",
      status: "unhealthy",
    });
  }
});

// Audit log endpoint (if implemented)
router.get(
  "/audit-logs",
  requirePermission(Permission.READ_ADMIN),
  async (req: Request, res: Response) => {
    try {
      // In a real implementation, you'd fetch from a proper audit log store
      const mockAuditLogs = [
        {
          id: "1",
          timestamp: new Date().toISOString(),
          action: "api_key_created",
          user: req.user?.id,
          details: { keyName: "Test API Key" },
        },
        {
          id: "2",
          timestamp: new Date(Date.now() - 60000).toISOString(),
          action: "ip_blacklisted",
          user: req.user?.id,
          details: { ip: "192.168.1.100" },
        },
      ];

      res.json({
        success: true,
        data: mockAuditLogs,
        total: mockAuditLogs.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch audit logs",
      });
    }
  }
);

export default router;
