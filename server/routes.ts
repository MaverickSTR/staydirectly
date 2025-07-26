// Add global type declarations at the top
declare global {
  var apiRateLimit: Record<string, { count: number; timestamp: number }>;
  var apiRateLimitCache: Record<string, { timestamp: number }>;
}

import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import { storage } from "./storage-factory";
import {
  insertCitySchema,
  insertPropertySchema,
  insertReviewSchema,
  insertFavoriteSchema,
  properties,
  cities,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { setupSitemapRoutes } from "./sitemap";
import { registerHospitableAuthRoutes } from "./hospitable-auth";
import { createServerApiClient } from "./hospitable-client";
import hospitable_controller from "./hospitable-flow-controller";
import dotenv from "dotenv";
import {
  generalRateLimiter,
  strictRateLimiter,
  userRateLimiter,
  createCustomRateLimiter,
} from "./utils/rateLimiter";

dotenv.config();

const customSearchLimiter = createCustomRateLimiter({
  windowMs: 30 * 1000, // 30 seconds
  max: 5,
  keyGenerator: (req) => req.ip + ":" + (req.query.q ?? ""),
  message: "Too many search requests. Please wait a moment and try again.",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // SEO Routes
  const seoRouter = Router();

  // Robots.txt
  seoRouter.get("/robots.txt", (req, res) => {
    const robotsTxt = `
# www.robotstxt.org/

User-agent: *
Allow: /

# Sitemaps
Sitemap: https://staydirectly.com/sitemap.xml
`;
    res.type("text/plain");
    res.send(robotsTxt);
  });

  // Setup sitemap routes
  setupSitemapRoutes(seoRouter);

  // Auth routes for Hospitable
  const authRouter = Router();
  registerHospitableAuthRoutes(authRouter);

  // Hospitable flow routes
  app.post("/api/hospitable/connect",
    userRateLimiter,
    hospitable_controller.connectHospitable
  );
  app.post("/api/hospitable/import-listings",
    userRateLimiter,
    hospitable_controller.importCustomerListings
  );
  app.post("/api/hospitable/fetch-property-images",
    userRateLimiter,
    hospitable_controller.fetchPropertyImages
  );
  app.post("/api/hospitable/publish-properties",
    strictRateLimiter,
    hospitable_controller.markPropertiesForPublishing
  );

  // Get all customers from Hospitable
  app.get("/api/hospitable/customers",
    generalRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const client = createServerApiClient();
        const customers = await client.getAllCustomers();
        res.json(customers);
      } catch (error) {
        console.error("Error fetching customers from Hospitable:", error);
        res.status(500).json({
          message: "Failed to fetch customers from Hospitable",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Get listings for a specific customer from Hospitable
  app.get("/api/hospitable/customers/:customerId/listings",
    generalRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const { customerId } = req.params;

        if (!customerId) {
          return res.status(400).json({
            message: "Customer ID is required",
            error: "Please provide a valid customerId in the URL path",
          });
        }

        console.log(
          `[API Route] Fetching listings for customer: ${customerId}`
        );

        const client = createServerApiClient();
        const listings = await client.getCustomerListings(customerId);

        res.json({
          success: true,
          customerId,
          count: listings.length,
          data: listings,
        });
      } catch (error) {
        console.error(
          `Error fetching listings for customer ${req.params.customerId}:`,
          error
        );
        res.status(500).json({
          message: "Failed to fetch customer listings from Hospitable",
          customerId: req.params.customerId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // API Route: Get nearby places from Google Places Web API (Server-side fallback)
  app.get("/api/nearby", async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng)
      return res.status(400).json({ error: "Missing latitude or longitude" });

    // Check if Google API key is available
    if (!process.env.GOOGLE_API_KEY) {
      console.warn("GOOGLE_API_KEY not found - returning empty nearby places");
      return res.json([]);
    }

    try {
      const url = "https://places.googleapis.com/v1/places:searchNearby";
      const body = {
        locationRestriction: {
          circle: {
            center: {
              latitude: parseFloat(lat as string),
              longitude: parseFloat(lng as string),
            },
            radius: 2000,
          },
        },
        includedTypes: ["restaurant", "supermarket", "park"],
        maxResultCount: 10,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.location,places.id",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Places API error:", text);
        return res
          .status(response.status)
          .json({ error: "Places API error", details: text });
      }

      const data = (await response.json()) as any;
      res.json(data.places || []);
    } catch (err) {
      console.error("Server error fetching nearby places:", err);
      res.status(500).json({ error: "Failed to fetch nearby places" });
    }
  });

  // Apply SEO and auth routes
  app.use(seoRouter);
  app.use("/api", authRouter);

  // Properties API
  app.get("/api/properties",
    generalRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const limit = req.query.limit
          ? parseInt(req.query.limit as string)
          : 10;
        const offset = req.query.offset
          ? parseInt(req.query.offset as string)
          : 0;
        const isPublished = req.query.isPublished as string;

        if (isPublished === "true") {
          const properties = await storage.searchProperties(
            "isPublished:true",
            { limit, offset }
          );
          return res.json(properties);
        } else if (isPublished === "false") {
          const properties = await storage.searchProperties(
            "isPublished:false",
            { limit, offset }
          );
          return res.json(properties);
        } else if (isPublished === "all") {
          const properties = await storage.getProperties(limit, offset);
          return res.json(properties);
        }

        const properties = await storage.getProperties(limit, offset);
        res.json(properties);
      } catch (error) {
        console.error("Error fetching properties:", error);
        res.status(500).json({
          message: "Failed to fetch properties",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  app.get("/api/properties/featured", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
      const properties = await storage.getFeaturedProperties(limit);
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured properties" });
    }
  });

  app.get("/api/properties/search",
    customSearchLimiter,
    async (req: Request, res: Response) => {
      try {
        console.log(
          `[API Route] Full URL: ${req.protocol}://${req.get("host")}${req.originalUrl
          }`
        );
        console.log(`[API Route] Query = ${req.query.q}`);
        console.log(`[API Route] Filters (raw) = ${req.query.filters}`);

        const query = (req.query.q as string) || "";
        const filters = req.query.filters
          ? JSON.parse(req.query.filters as string)
          : undefined;

        const properties = await storage.searchProperties(query, filters);
        res.json(properties);
      } catch (error) {
        console.error("Error in /api/properties/search:", error);
        res.status(500).json({ message: "Failed to search properties" });
      }
    }
  );

  app.get("/api/properties/:id",
    generalRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const property = await storage.getProperty(id);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        res.json(property);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch property" });
      }
    }
  );

  app.post("/api/properties",
    strictRateLimiter,
    async (req: Request, res: Response) => {
      try {
        console.log("[POST /api/properties] Received body:", req.body);
        const propertyData = insertPropertySchema.parse(req.body);
        console.log(
          "[POST /api/properties] Parsed propertyData:",
          propertyData
        );
        const property = await storage.createProperty(propertyData);
        console.log("[POST /api/properties] Created property:", property);
        res.status(201).json(property);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error(
            "[POST /api/properties] Validation error:",
            error.errors
          );
          return res
            .status(400)
            .json({ message: "Invalid property data", errors: error.errors });
        }
        console.error("[POST /api/properties] Unexpected error:", error);
        res.status(500).json({ message: "Failed to create property" });
      }
    }
  );

  app.patch("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const propertyData = req.body;

      const existingProperty = await storage.getProperty(id);
      if (!existingProperty) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (propertyData.unpublish === true) {
        propertyData.publishedAt = null;
        delete propertyData.unpublish;
      }
      if (propertyData.bookingWidgetHtml) {
        propertyData.bookingWidgetUrl = propertyData.bookingWidgetHtml;
        delete propertyData.bookingWidgetHtml;
      }
      if (propertyData.reviewsWidgetHtml) {
        propertyData.reviewWidgetCode = propertyData.reviewsWidgetHtml;
        delete propertyData.reviewsWidgetHtml;
      }

      const updatedProperty = await storage.updateProperty(id, propertyData);
      res.json(updatedProperty);
    } catch (error) {
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);

      const existingProperty = await storage.getProperty(id);
      if (!existingProperty) {
        return res.status(404).json({ message: "Property not found" });
      }

      const success = await storage.deleteProperty(id);

      if (success) {
        res.status(200).json({ message: "Property deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete property" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Cities API
  app.get("/api/cities", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const cities = await storage.getCities(limit);
      res.json(cities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cities" });
    }
  });

  app.get("/api/cities/featured", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
      const cities = await storage.getFeaturedCities(limit);
      console.log(`Returning ${cities.length} cities with active properties`);
      res.json(cities);
    } catch (error) {
      console.error("Error fetching featured cities:", error);
      res.status(500).json({ message: "Failed to fetch featured cities" });
    }
  });

  app.get("/api/cities/:name", async (req: Request, res: Response) => {
    try {
      const cityName = req.params.name;
      const city = await storage.getCityByNameWithPropertyCount(cityName);

      if (!city) {
        return res.status(404).json({ message: "City not found" });
      }

      console.log(
        `Returning city ${city.name} with ${city.propertyCount} total properties`
      );
      res.json(city);
    } catch (error) {
      console.error("Error fetching city:", error);
      res.status(500).json({ message: "Failed to fetch city" });
    }
  });

  app.post("/api/cities", async (req: Request, res: Response) => {
    try {
      const cityData = insertCitySchema.parse(req.body);
      const city = await storage.createCity(cityData);
      res.status(201).json(city);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid city data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create city" });
    }
  });

  app.get("/api/cities/:name/properties",
    async (req: Request, res: Response) => {
      try {
        const limit = req.query.limit
          ? parseInt(req.query.limit as string)
          : 10;
        const offset = req.query.offset
          ? parseInt(req.query.offset as string)
          : 0;
        const properties = await storage.getPropertiesByCity(
          req.params.name,
          limit,
          offset
        );
        res.json(properties);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch city properties" });
      }
    }
  );

  // Neighborhoods API
  app.get("/api/cities/:id/neighborhoods",
    async (req: Request, res: Response) => {
      try {
        const cityId = parseInt(req.params.id);
        const neighborhoods = await storage.getNeighborhoods(cityId);
        res.json(neighborhoods);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch neighborhoods" });
      }
    }
  );

  // Reviews API
  app.get("/api/properties/:id/reviews",
    async (req: Request, res: Response) => {
      try {
        const propertyId = parseInt(req.params.id);
        const reviews = await storage.getReviews(propertyId);
        res.json(reviews);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch reviews" });
      }
    }
  );

  app.post("/api/reviews", async (req: Request, res: Response) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Favorites API
  app.get("/api/users/:userId/favorites",
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const favorites = await storage.getFavorites(userId);
        res.json(favorites);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch favorites" });
      }
    }
  );

  app.post("/api/favorites", async (req: Request, res: Response) => {
    try {
      const favoriteData = insertFavoriteSchema.parse(req.body);
      const favorite = await storage.addFavorite(favoriteData);
      res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid favorite data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites", async (req: Request, res: Response) => {
    try {
      const { userId, propertyId } = req.body;
      if (!userId || !propertyId) {
        return res
          .status(400)
          .json({ message: "Missing userId or propertyId" });
      }

      const success = await storage.removeFavorite(
        parseInt(userId),
        parseInt(propertyId)
      );

      if (!success) {
        return res.status(404).json({ message: "Favorite not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.get("/api/favorites/check", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const propertyId = parseInt(req.query.propertyId as string);

      if (isNaN(userId) || isNaN(propertyId)) {
        return res
          .status(400)
          .json({ message: "Invalid userId or propertyId" });
      }

      const isFavorite = await storage.isFavorite(userId, propertyId);
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Hospitable API routes are properly configured and enabled

  const httpServer = createServer(app);
  return httpServer;
}
