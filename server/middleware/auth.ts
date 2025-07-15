// server/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Extend Express Request type
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id?: string;
      email?: string;
      role?: string;
      permissions?: string[];
      apiKey?: string;
    };
    isAuthenticated?: boolean;
    authMethod?: "jwt" | "apikey" | "session";
  }
}

// User role definitions
export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  API_CLIENT = "api_client",
  READONLY = "readonly",
}

// Permission definitions
export enum Permission {
  READ_PROPERTIES = "read:properties",
  WRITE_PROPERTIES = "write:properties",
  DELETE_PROPERTIES = "delete:properties",
  READ_USERS = "read:users",
  WRITE_USERS = "write:users",
  READ_ADMIN = "read:admin",
  WRITE_ADMIN = "write:admin",
  MANAGE_API_KEYS = "manage:api_keys",
  IMPORT_DATA = "import:data",
  EXPORT_DATA = "export:data",
}

// Role permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.USER]: [
    Permission.READ_PROPERTIES,
    Permission.WRITE_PROPERTIES,
    Permission.READ_USERS,
  ],
  [UserRole.API_CLIENT]: [
    Permission.READ_PROPERTIES,
    Permission.WRITE_PROPERTIES,
    Permission.IMPORT_DATA,
    Permission.EXPORT_DATA,
  ],
  [UserRole.READONLY]: [Permission.READ_PROPERTIES, Permission.READ_USERS],
};

// In-memory API key store (in production, use database)
const apiKeys = new Map<
  string,
  {
    id: string;
    name: string;
    key: string;
    hashedKey: string;
    role: UserRole;
    permissions: Permission[];
    isActive: boolean;
    lastUsed?: Date;
    createdAt: Date;
    expiresAt?: Date;
    rateLimit?: number;
    allowedIPs?: string[];
  }
>();

// JWT secret
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Load API keys from environment or file (for development)
const loadApiKeys = () => {
  // Default admin API key for development
  if (process.env.NODE_ENV === "development" && !apiKeys.size) {
    const adminKey =
      process.env.ADMIN_API_KEY || "dev-admin-key-12345678901234567890";
    const hashedKey = bcrypt.hashSync(adminKey, 10);

    apiKeys.set(adminKey, {
      id: "admin-1",
      name: "Development Admin Key",
      key: adminKey,
      hashedKey,
      role: UserRole.ADMIN,
      permissions: ROLE_PERMISSIONS[UserRole.ADMIN],
      isActive: true,
      createdAt: new Date(),
      rateLimit: 1000, // Higher limit for admin
    });

    console.log("🔑 Development admin API key loaded");
  }

  // Load from environment variables (STAYDIRECTLY_API_KEY_*)
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("STAYDIRECTLY_API_KEY_")) {
      const keyName = key.replace("STAYDIRECTLY_API_KEY_", "");
      const apiKey = process.env[key];

      if (apiKey && apiKey.length >= 32) {
        const hashedKey = bcrypt.hashSync(apiKey, 10);

        apiKeys.set(apiKey, {
          id: `env-${keyName.toLowerCase()}`,
          name: `Environment Key: ${keyName}`,
          key: apiKey,
          hashedKey,
          role: UserRole.API_CLIENT,
          permissions: ROLE_PERMISSIONS[UserRole.API_CLIENT],
          isActive: true,
          createdAt: new Date(),
        });

        console.log(`🔑 Loaded API key: ${keyName}`);
      }
    }
  });
};

// Initialize API keys
loadApiKeys();

// Utility functions
export const generateApiKey = (): string => {
  return "sk_" + crypto.randomBytes(32).toString("hex");
};

export const hashApiKey = (key: string): string => {
  return bcrypt.hashSync(key, 10);
};

export const verifyApiKey = (key: string, hashedKey: string): boolean => {
  return bcrypt.compareSync(key, hashedKey);
};

// JWT token functions
export const generateJWT = (payload: {
  id: string;
  email: string;
  role: UserRole;
  permissions?: Permission[];
}): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "staydirectly-api",
    audience: "staydirectly-client",
  });
};

export const verifyJWT = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: "staydirectly-api",
      audience: "staydirectly-client",
    });
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

// API key validation middleware
export const validateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      return next(); // Continue without API key (will be handled by other auth)
    }

    // Find API key in store
    const keyData = apiKeys.get(apiKey);

    if (!keyData || !keyData.isActive) {
      return res.status(401).json({
        error: "Invalid API key",
        message: "The provided API key is invalid or inactive",
      });
    }

    // Check expiration
    if (keyData.expiresAt && new Date() > keyData.expiresAt) {
      return res.status(401).json({
        error: "API key expired",
        message: "The provided API key has expired",
      });
    }

    // Check IP restrictions
    if (keyData.allowedIPs && keyData.allowedIPs.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress;
      if (!keyData.allowedIPs.includes(clientIP || "")) {
        return res.status(403).json({
          error: "IP not allowed",
          message: "Your IP address is not authorized to use this API key",
        });
      }
    }

    // Update last used timestamp
    keyData.lastUsed = new Date();

    // Set user context
    req.user = {
      id: keyData.id,
      role: keyData.role,
      permissions: keyData.permissions,
      apiKey: apiKey,
    };
    req.isAuthenticated = true;
    req.authMethod = "apikey";

    next();
  } catch (error) {
    console.error("API key validation error:", error);
    res.status(500).json({
      error: "Authentication error",
      message: "Unable to validate API key",
    });
  }
};

// JWT authentication middleware
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractJWT(req);

    if (!token) {
      return next(); // Continue without JWT (will be handled by other auth)
    }

    const decoded = verifyJWT(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions:
        decoded.permissions || ROLE_PERMISSIONS[decoded.role as UserRole] || [],
    };
    req.isAuthenticated = true;
    req.authMethod = "jwt";

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid token",
      message: "The provided JWT token is invalid or expired",
    });
  }
};

// Combined authentication middleware
export const authenticate = [
  validateApiKey,
  authenticateJWT,
  (req: Request, res: Response, next: NextFunction) => {
    // If no authentication method succeeded
    if (!req.isAuthenticated) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Please provide a valid API key or JWT token",
        supportedMethods: [
          "API Key (X-API-Key header)",
          "JWT Token (Authorization Bearer)",
        ],
      });
    }

    next();
  },
];

// Optional authentication (doesn't fail if no auth provided)
export const optionalAuth = [
  validateApiKey,
  authenticateJWT,
  (req: Request, res: Response, next: NextFunction) => {
    // Continue regardless of authentication status
    next();
  },
];

// Permission checking middleware
export const requirePermission = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be authenticated to access this resource",
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: "Insufficient permissions",
        message:
          "You do not have the required permissions to access this resource",
        required: permissions,
        current: userPermissions,
      });
    }

    next();
  };
};

// Role checking middleware
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be authenticated to access this resource",
      });
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({
        error: "Insufficient role",
        message: "You do not have the required role to access this resource",
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole(UserRole.ADMIN);

// Rate limiting based on authentication
export const authBasedRateLimit = (req: Request): number => {
  if (!req.user) return 50; // Default for unauthenticated

  switch (req.user.role) {
    case UserRole.ADMIN:
      return 1000;
    case UserRole.API_CLIENT:
      return 500;
    case UserRole.USER:
      return 200;
    case UserRole.READONLY:
      return 100;
    default:
      return 50;
  }
};

// Utility functions for extracting auth tokens
const extractApiKey = (req: Request): string | null => {
  // Check X-API-Key header
  const headerKey = req.headers["x-api-key"] as string;
  if (headerKey) return headerKey;

  // Check Authorization header (Bearer format)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // Check if it looks like an API key (starts with sk_ or is long enough)
    if (token.startsWith("sk_") || token.length >= 32) {
      return token;
    }
  }

  // Check query parameter (for development only)
  if (process.env.NODE_ENV === "development") {
    const queryKey = req.query.api_key as string;
    if (queryKey) return queryKey;
  }

  return null;
};

const extractJWT = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // Check if it looks like a JWT (has dots)
    if (token.includes(".")) {
      return token;
    }
  }

  return null;
};

// API key management functions
export const apiKeyManager = {
  create: (data: {
    name: string;
    role: UserRole;
    permissions?: Permission[];
    expiresAt?: Date;
    allowedIPs?: string[];
    rateLimit?: number;
  }) => {
    const key = generateApiKey();
    const hashedKey = hashApiKey(key);

    const keyData = {
      id: crypto.randomUUID(),
      name: data.name,
      key,
      hashedKey,
      role: data.role,
      permissions: data.permissions || ROLE_PERMISSIONS[data.role],
      isActive: true,
      createdAt: new Date(),
      expiresAt: data.expiresAt,
      allowedIPs: data.allowedIPs,
      rateLimit: data.rateLimit,
    };

    apiKeys.set(key, keyData);

    return {
      id: keyData.id,
      key: key, // Return the plain key only once
      name: keyData.name,
      role: keyData.role,
      permissions: keyData.permissions,
      createdAt: keyData.createdAt,
      expiresAt: keyData.expiresAt,
    };
  },

  revoke: (key: string): boolean => {
    const keyData = apiKeys.get(key);
    if (keyData) {
      keyData.isActive = false;
      return true;
    }
    return false;
  },

  list: () => {
    return Array.from(apiKeys.values()).map((k) => ({
      id: k.id,
      name: k.name,
      role: k.role,
      isActive: k.isActive,
      lastUsed: k.lastUsed,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      // Don't return the actual key
      keyPreview: k.key.substring(0, 8) + "...",
    }));
  },

  getStats: () => ({
    total: apiKeys.size,
    active: Array.from(apiKeys.values()).filter((k) => k.isActive).length,
    byRole: Object.values(UserRole).reduce((acc, role) => {
      acc[role] = Array.from(apiKeys.values()).filter(
        (k) => k.role === role
      ).length;
      return acc;
    }, {} as Record<string, number>),
  }),
};

// Validation schemas
export const createApiKeySchema = z.object({
  name: z.string().min(3).max(100),
  role: z.nativeEnum(UserRole),
  permissions: z.array(z.nativeEnum(Permission)).optional(),
  expiresInDays: z.number().min(1).max(365).optional(),
  allowedIPs: z.array(z.string().ip()).optional(),
  rateLimit: z.number().min(10).max(10000).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export { UserRole, Permission, ROLE_PERMISSIONS };
