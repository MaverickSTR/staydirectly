import { Request, Response } from "express";
import axios from "axios";
import { storage } from "./storage-factory";
import { createServerApiClient } from "./hospitable-client";
import { type Property } from "@shared/schema";
import dotenv from "dotenv";
import countries from "i18n-iso-countries";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enLocalePath = path.join(
  __dirname,
  "../node_modules/i18n-iso-countries/langs/en.json"
);
const enLocaleContent = await fs.readFile(enLocalePath, "utf-8");
const enLocale = JSON.parse(enLocaleContent);

countries.registerLocale(enLocale);

// Import correct type for properties from schema

dotenv.config();

// Register countries for i18n-iso-countries
countries.registerLocale(enLocale);

// Rate limiting control
const apiRateLimits: Record<
  string,
  { count: number; timestamp: number; queue: any[] }
> = {};
const MAX_REQUESTS_PER_MINUTE = 30; // Typical API rate limit
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Extract customer ID and listing ID from platform ID
 */
function extractPropertyIds(platformId: string): {
  customerId: string | null;
  listingId: string | null;
} {
  if (!platformId) {
    return { customerId: null, listingId: null };
  }

  // Handle format like "24RZHJ:461a318e-a2fa-4fd9-9eae-2ab6793de8a3"
  const parts = platformId.split(":");
  if (parts.length === 2) {
    return { customerId: parts[0], listingId: parts[1] };
  }

  return { customerId: null, listingId: null };
}

/**
 * Check if we're being rate limited and manage the request queue
 */
function checkRateLimit(key: string): boolean {
  const now = Date.now();

  // Initialize rate limit data if it doesn't exist
  if (!apiRateLimits[key]) {
    apiRateLimits[key] = { count: 0, timestamp: now, queue: [] };
  }

  const limit = apiRateLimits[key];

  // Reset count if window has passed
  if (now - limit.timestamp > RATE_LIMIT_WINDOW_MS) {
    limit.count = 0;
    limit.timestamp = now;
  }

  // Check if we're at the limit
  if (limit.count >= MAX_REQUESTS_PER_MINUTE) {
    return true; // We're rate limited
  }

  // Increment count
  limit.count++;
  return false; // Not rate limited
}

/**
 * Process a queued request after rate limit window resets
 */
async function processQueue(key: string): Promise<void> {
  const limit = apiRateLimits[key];
  if (!limit || limit.queue.length === 0) return;

  const request = limit.queue.shift();
  if (!request) return;

  try {
    const result = await request.fn();
    request.resolve(result);
  } catch (error) {
    request.reject(error);
  }

  // Process next item in queue if rate limit allows
  if (!checkRateLimit(key) && limit.queue.length > 0) {
    setTimeout(() => processQueue(key), 1000); // Slight delay between requests
  } else if (limit.queue.length > 0) {
    // Schedule next batch when rate limit resets
    const timeToReset = RATE_LIMIT_WINDOW_MS - (Date.now() - limit.timestamp);
    setTimeout(() => {
      limit.count = 0;
      limit.timestamp = Date.now();
      processQueue(key);
    }, timeToReset + 100); // Add small buffer
  }
}

/**
 * Enqueue a rate-limited API request
 */
function enqueueRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    // Initialize rate limit data if it doesn't exist
    if (!apiRateLimits[key]) {
      apiRateLimits[key] = { count: 0, timestamp: Date.now(), queue: [] };
    }

    const limit = apiRateLimits[key];

    // Add to queue
    limit.queue.push({ fn, resolve, reject });

    // If we're not rate limited and this is the only item, process immediately
    if (limit.queue.length === 1 && !checkRateLimit(key)) {
      processQueue(key);
    }
  });
}

/**
 * Process a batch of properties for import with proper rate limiting
 */
export async function importCustomerListings(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { customerId, shouldAvoidUpdateForCustomer } = req.body;

    if (!customerId) {
      res.status(400).json({
        message: "Customer ID is required",
        details: "Please provide a valid customerId in the request body",
      });
      return;
    }

    // Check if we already have properties for this customer
    const allCustomerListings = await storage.getPropertiesByCustomerId(
      customerId
    );

    const allCustomerListingsTyped: Property[] | undefined =
      allCustomerListings;
    const firstProperty: Property | undefined = allCustomerListingsTyped?.sort(
      (a: Property, b: Property) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime()
    )[0];

    const firstPropertyUpdatedAt = firstProperty?.updatedAt
      ? new Date(firstProperty.updatedAt)
      : null;

    if (
      (allCustomerListings && firstPropertyUpdatedAt) ||
      shouldAvoidUpdateForCustomer
    ) {
      const lastUpdated = firstPropertyUpdatedAt;
      const now = new Date();
      let daysDiff = 0;
      if (lastUpdated) {
        const timeDiff = now.getTime() - lastUpdated.getTime();
        daysDiff = timeDiff / (1000 * 3600 * 24);
      }

      // If images were updated within the last 7 days, use cached version
      if (daysDiff < 7 || shouldAvoidUpdateForCustomer) {
        res.status(200).json(allCustomerListings);
        return;
      }
    }

    // Create API client
    const client = createServerApiClient();

    // Fetch customer listings with rate limiting
    const rateLimitKey = `customer_listings_${customerId}`;

    const response = await enqueueRequest(rateLimitKey, () =>
      client.getCustomerListings(customerId)
    );

    if (!response?.length) {
      res
        .status(404)
        .json({ message: "No properties found in Hospitable account" });
      return;
    }

    // Import each property into database
    let importedCount = 0;
    const importedProperties = [];

    for (const prop of response) {
      try {
        // Check if property already exists
        let existingProperty = await storage.getPropertyByExternalId(prop.id);

        const propertyData = {
          name: prop.private_name || prop.public_name || "Unnamed Property",
          title: prop.public_name || prop.private_name || "Unnamed Property",
          description: prop.description || "Beautiful property",
          price: Number(prop.base_price) || 99,
          imageUrl: (prop.picture || prop.photos?.[0]?.url || "").replace(
            /\/im(?=\/)/g,
            ""
          ),
          additionalImages:
            prop.photos
              ?.slice(1)
              .map((p: any) => p.url.replace(/\/im(?=\/)/g, "")) || [],

          city: prop.address?.city || "Unknown",
          state: prop.address?.state || "",
          zipCode: prop.address?.zipcode || "",
          country: (() => {
            const code = prop.address?.country_code;
            if (!code) return "Unknown";
            const name = countries.getName(code.toUpperCase(), "en", {
              select: "official",
            });
            return name || code; // fallback to code if name is undefined
          })(),
          location: `${prop.address?.city || ""}, ${
            prop.address?.state || ""
          }, ${prop.address?.country_code || ""}`
            .replace(/, ,/g, ",")
            .replace(/^, /, "")
            .replace(/, $/, ""),

          latitude: prop.address?.latitude
            ? Number(prop.address.latitude)
            : null,
          longitude: prop.address?.longitude
            ? Number(prop.address.longitude)
            : null,
          bedrooms: prop.bedrooms ? Number(prop.bedrooms) : 1,
          bathrooms: prop.bathrooms ? Number(prop.bathrooms) : 1,
          maxGuests: prop.max_guests ? Number(prop.max_guests) : 2,
          type: prop.property_type || "Apartment",

          // Store the detailed capacity object from the Hospitable API
          capacity: prop.capacity
            ? {
                max: prop.capacity.max
                  ? Number(prop.capacity.max)
                  : prop.max_guests
                  ? Number(prop.max_guests)
                  : 2,
                beds: prop.capacity.beds
                  ? Number(prop.capacity.beds)
                  : prop.beds
                  ? Number(prop.beds)
                  : 1,
                bedrooms: prop.capacity.bedrooms
                  ? Number(prop.capacity.bedrooms)
                  : prop.bedrooms
                  ? Number(prop.bedrooms)
                  : 1,
                bathrooms: prop.capacity.bathrooms
                  ? Number(prop.capacity.bathrooms)
                  : prop.bathrooms
                  ? Number(prop.bathrooms)
                  : 1,
              }
            : null,

          // Store amenities
          amenities: prop.amenities || [],
          featuredAmenities:
            prop.featured_amenities || prop.amenities?.slice(0, 6) || [],

          // External API identifiers
          externalId: prop.id,
          externalSource: "hospitable",
          platformId: `${customerId}:${prop.id}`,

          // SEO fields
          slug: `${prop.id}-${(
            prop.public_name ||
            prop.private_name ||
            "property"
          )
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}`,

          // Required fields for DB
          hostId: 1, // Default host ID
          hostName: prop.host_name || "StayDirectly Host",
        };

        propertyData.additionalImages = existingProperty?.additionalImages
          ?.length
          ? existingProperty.additionalImages.map((url: string) =>
              url.replace(/\/im(?=\/)/g, "")
            )
          : prop.photos
              ?.slice(1)
              .map((p: any) => p.url.replace(/\/im(?=\/)/g, "")) || [];

        if (existingProperty) {
          // Update existing property
          const updatedProperty = await storage.updatePropertyByExternalId(
            prop.id,
            propertyData
          );
          if (updatedProperty) {
            importedProperties.push(updatedProperty);
          }
        } else {
          // Create new property
          const newProperty = await storage.createProperty(propertyData);
          importedProperties.push(newProperty);
        }
        importedCount++;
      } catch (error) {
        // Silent error handling - property import failed
      }
    }

    res.status(200).json(importedProperties);
  } catch (error) {
    res.status(500).json({
      message: "Error importing properties from Hospitable",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Fetch property images with rate limiting and caching
 */
export async function fetchPropertyImages(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      customerId,
      listingId,
      position = 0,
      shouldUpdateCachedImages,
    } = req.body;

    if (!customerId || !listingId) {
      res.status(400).json({
        message: "Customer ID and Listing ID are required",
        details: { customerId, listingId },
      });
      return;
    }

    // Check if we already have this image
    const property = await storage.getPropertyByPlatformId(
      `${customerId}:${listingId}`
    );

    if (property && property.imagesStoredAt && !shouldUpdateCachedImages) {
      const lastUpdated = new Date(property.imagesStoredAt);
      const now = new Date();
      const timeDiff = now.getTime() - lastUpdated.getTime();
      const daysDiff = timeDiff / (1000 * 3600 * 24);

      // Check if property.additionalImages exist and is an array before accessing it
      const hasAdditionalImages =
        Array.isArray(property.additionalImages) &&
        property.additionalImages.length > 0;

      // If images were updated within the last 7 days, use cached version
      if (daysDiff < 7 && property.imageUrl && hasAdditionalImages) {
        // Return image data
        res.status(200).json({
          customerId,
          listingId,
          mainImage: property.imageUrl,
          additionalImages: property.additionalImages || [],
          fromCache: true,
        });
        return;
      }
    }

    // Rate limit key for this API endpoint
    const rateLimitKey = `property_images_${customerId}`;

    try {
      // Fetch images from API with rate limiting
      const client = createServerApiClient();

      const images = await enqueueRequest(rateLimitKey, () =>
        client.getListingImages(customerId, listingId)
      );

      if (!images || images.length === 0) {
        res.status(404).json({
          message: "No images found for this listing",
          details: { customerId, listingId },
        });
        return;
      }

      // Process and store images
      const mainImage = images[position]?.url.replace(/\/im(?=\/)/g, "");

      const additionalImages = images
        .slice(1, 20)
        .map((img: any) => img.url.replace(/\/im(?=\/)/g, ""));

      // Store in property data
      if (property) {
        await storage.updateProperty(property.id, {
          imageUrl: mainImage,
          additionalImages,
          imagesStoredAt: new Date(),
        });
      }

      // Return image data
      res.status(200).json({
        customerId,
        listingId,
        mainImage,
        additionalImages,
        fromCache: false,
      });
    } catch (error) {
      // If we have a property with existing images, return those as fallback
      if (property && property.imageUrl) {
        res.status(200).json({
          customerId,
          listingId,
          mainImage: property.imageUrl,
          additionalImages: property.additionalImages || [],
          fromCache: true,
          fetchError: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    res.status(500).json({
      message: "Error fetching property images",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Mark properties for publishing
 */
export async function markPropertiesForPublishing(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { customerId, listingIds } = req.body;

    if (
      !customerId ||
      !listingIds ||
      !Array.isArray(listingIds) ||
      listingIds.length === 0
    ) {
      res.status(400).json({
        message: "Customer ID and at least one listing ID are required",
      });
      return;
    }

    // Update each property
    const updatedProperties = [];

    for (const listingId of listingIds) {
      try {
        // Find property by platform ID
        const property = await storage.getPropertyByPlatformId(
          `${customerId}:${listingId}`
        );

        if (!property) {
          continue;
        }

        // Mark as published
        const updated = await storage.updateProperty(property.id, {
          isActive: true,
          isVerified: true,
          status: "active",
        });

        updatedProperties.push(updated);
      } catch (error) {
        // Silent error handling - property publish failed
      }
    }

    // Log the result to the backend console
    console.log(
      `[markPropertiesForPublishing] Published properties for customerId=${customerId}:`,
      updatedProperties
    );

    res.status(200).json(updatedProperties);
  } catch (error) {
    res.status(500).json({
      message: "Error marking properties for publishing",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Establish connection with Hospitable
 */
export async function connectHospitable(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { customerId, code } = req.body;
    const action = (req.query.action as string) || req.body.action;

    // Generate auth link for a customer
    if (action === "auth-link" && customerId) {
      // Create auth code using the Hospitable API
      const redirectUrl =
        process.env.NEXT_PUBLIC_HOSPITABLE_REDIRECT_URI ||
        "http://localhost:5000/auth/callback";

      console.log(
        `[Flow Controller] Generating auth link for customer: ${customerId}`
      );
      console.log(`[Flow Controller] Using redirect URL: ${redirectUrl}`);

      try {
        const client = createServerApiClient();
        const authCodeResponse = await client.createAuthCode(
          customerId,
          redirectUrl
        );
        console.log(authCodeResponse, "sdfsdfsdfsdfsdfsdf");

        console.log(
          `[Flow Controller] Auth code response received:`,
          JSON.stringify(authCodeResponse, null, 2)
        );

        // Check if we got a valid response
        if (!authCodeResponse) {
          console.error(`[Flow Controller] No response from createAuthCode`);
          res.status(500).json({
            message:
              "Failed to generate auth code - no response from Hospitable API",
            customerId: customerId,
            redirectUrl: redirectUrl,
          });
          return;
        }

        // Extract the auth URL from the Hospitable API response
        // The API returns: { data: { return_url: "...", expires_at: "..." } }
        const authUrl =
          authCodeResponse.data?.return_url ||
          authCodeResponse.return_url ||
          authCodeResponse.auth_url ||
          authCodeResponse.url ||
          null;

        const expiresAt = authCodeResponse.data?.expires_at || null;

        const responseData = {
          authUrl: authUrl,
          expiresAt: expiresAt,
        };

        console.log(
          `[Flow Controller] Sending response:`,
          JSON.stringify(responseData, null, 2)
        );

        res.status(200).json(responseData);
        return;
      } catch (authError) {
        console.error(
          `[Flow Controller] Error generating auth code:`,
          authError
        );

        // Return error details along with basic info
        res.status(500).json({
          message: "Failed to generate auth code",
          error:
            authError instanceof Error ? authError.message : String(authError),
          customerId: customerId,
          redirectUrl: redirectUrl,
        });
        return;
      }
    }

    // Create a new customer and generate auth link in one step
    if (action === "customer") {
      console.log(
        `[Flow Controller] Creating customer and generating auth link...`
      );

      const client = createServerApiClient();

      // Step 1: Create customer
      const customerResponse = await client.createCustomer(req.body);

      // Extract customer data - handle the actual nested structure from Hospitable
      let customer;
      let customerId;

      const customerData = customerResponse as any; // Type assertion for flexible response handling

      if (customerData.customer && customerData.customer.data) {
        // Structure: { customer: { data: { id: "...", ... } } }
        customer = customerData.customer.data;
        customerId = customerData.customer.data.id;
      } else if (customerData.data) {
        // Structure: { data: { id: "...", ... } }
        customer = customerData.data;
        customerId = customerData.data.id;
      } else {
        // Structure: { id: "...", ... }
        customer = customerData;
        customerId = customerData.id;
      }

      console.log(`[Flow Controller] Customer created with ID: ${customerId}`);

      // Step 2: Generate auth URL for the newly created customer
      const redirectUrl =
        process.env.NEXT_PUBLIC_HOSPITABLE_REDIRECT_URI ||
        "http://localhost:5000/auth/callback";

      console.log(
        `[Flow Controller] Generating auth link for new customer: ${customerId}`
      );

      try {
        const authCodeResponse = await client.createAuthCode(
          customerId,
          redirectUrl
        );

        console.log(
          `[Flow Controller] Auth code response for new customer:`,
          JSON.stringify(authCodeResponse, null, 2)
        );

        // Extract from nested data structure: { data: { return_url: "..." } }
        const authUrl =
          authCodeResponse.data?.return_url ||
          authCodeResponse.return_url ||
          authCodeResponse.auth_url ||
          authCodeResponse.url;

        const expiresAt = authCodeResponse.data?.expires_at || null;

        // Return complete response with customer and auth URL
        const apiResponse = {
          success: true,
          message: "Customer created and auth link generated successfully",
          customer: customer,
          customerId: customerId,
          authUrl: authUrl,
          expiresAt: expiresAt,
          redirectUrl: redirectUrl,
        };

        console.log(
          `[Flow Controller] ✅ Complete customer+auth response:`,
          JSON.stringify(apiResponse, null, 2)
        );

        res.status(201).json(apiResponse);
        return;
      } catch (authError) {
        console.error(
          `[Flow Controller] ❌ Failed to create auth code for new customer:`,
          authError
        );

        // Still return customer data even if auth link fails
        res.status(201).json({
          success: true,
          message:
            "Customer created successfully, but failed to generate auth link",
          customer: customer,
          customerId: customerId,
          authUrl: null,
          expiresAt: null,
          redirectUrl: redirectUrl,
          authError:
            authError instanceof Error ? authError.message : String(authError),
        });
        return;
      }
    }

    // Exchange auth code for token
    if (action === "token" && code) {
      const client = createServerApiClient();

      const tokenResponse = await client.exchangeCodeForToken(code);

      res.status(200).json(tokenResponse);
      return;
    }

    res
      .status(400)
      .json({ message: "Invalid action or missing required parameters" });
  } catch (error) {
    res.status(500).json({
      message: "Error connecting to Hospitable",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Export controller functions for use in routes
export default {
  importCustomerListings,
  fetchPropertyImages,
  markPropertiesForPublishing,
  connectHospitable,
};
