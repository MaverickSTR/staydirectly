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
  console.log(
    `\n📥 ==================== IMPORT CUSTOMER LISTINGS API CALLED ====================`
  );
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🌐 Request URL: ${req.method} ${req.originalUrl}`);
  console.log(`📦 Request Body:`, JSON.stringify(req.body, null, 2));

  try {
    const { customerId, shouldAvoidUpdateForCustomer } = req.body;

    console.log(`👤 Customer ID: ${customerId}`);
    console.log(`🔄 Should Avoid Update: ${shouldAvoidUpdateForCustomer}`);

    if (!customerId) {
      console.error(`❌ MISSING CUSTOMER ID!`);
      res.status(400).json({
        message: "Customer ID is required",
        details: "Please provide a valid customerId in the request body",
      });
      console.log(`❌ BAD REQUEST RESPONSE SENT - Missing Customer ID`);
      return;
    }

    console.log(
      `🔍 Checking for existing properties for customer: ${customerId}`
    );

    // Check if we already have properties for this customer
    const allCustomerListings = await storage.getPropertiesByCustomerId(
      customerId
    );

    console.log(
      `📊 Found ${
        allCustomerListings?.length || 0
      } existing properties for customer ${customerId}`
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

    console.log(
      `📅 Most recent property updated: ${
        firstPropertyUpdatedAt?.toISOString() || "Never"
      }`
    );

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

      console.log(`⏰ Days since last update: ${daysDiff.toFixed(1)} days`);

      // If images were updated within the last 7 days, use cached version
      if (daysDiff < 7 || shouldAvoidUpdateForCustomer) {
        console.log(
          `♻️ USING CACHED DATA - Skipping property updates/import for customer ${customerId}`
        );
        console.log(
          `📋 Returning ${allCustomerListings.length} cached properties`
        );

        res.status(200).json(allCustomerListings);
        console.log(`✨ CACHED PROPERTIES RESPONSE SENT SUCCESSFULLY`);
        return;
      }
    }

    console.log(`🆕 FETCHING FRESH DATA FROM HOSPITABLE API`);

    // Create API client
    const client = createServerApiClient();
    console.log(`🔗 Hospitable API client created`);

    // Log request information
    console.log(
      `📡 Calling Hospitable API to fetch listings for customer: ${customerId}`
    );

    // Fetch customer listings with rate limiting
    const rateLimitKey = `customer_listings_${customerId}`;
    console.log(`🚦 Using rate limit key: ${rateLimitKey}`);

    const response = await enqueueRequest(rateLimitKey, () =>
      client.getCustomerListings(customerId)
    );

    console.log(`✅ Hospitable API Response received!`);
    console.log(
      `📊 Retrieved ${
        response?.length || 0
      } listings for customer ${customerId}`
    );

    if (!response?.length) {
      console.warn(
        `⚠️ NO PROPERTIES FOUND in Hospitable for customer ${customerId}`
      );
      res
        .status(404)
        .json({ message: "No properties found in Hospitable account" });
      console.log(`❌ NOT FOUND RESPONSE SENT`);
      return;
    }

    console.log(
      `🔄 PROCESSING ${response.length} PROPERTIES FOR DATABASE IMPORT`
    );

    // Import each property into database
    let importedCount = 0;
    const importedProperties = [];

    for (const prop of response) {
      try {
        console.log(
          `\n🏠 Processing property: ${prop.id} - ${
            prop.public_name || prop.private_name
          }`
        );

        // Check if property already exists
        let existingProperty = await storage.getPropertyByExternalId(prop.id);
        console.log(
          `🔍 Property ${prop.id} exists in database: ${!!existingProperty}`
        );

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

        console.log(`💾 Transformed property data for ${prop.id}`);
        console.log(`   - Name: ${propertyData.name}`);
        console.log(`   - City: ${propertyData.city}`);
        console.log(`   - Price: $${propertyData.price}`);
        console.log(`   - Bedrooms: ${propertyData.bedrooms}`);
        console.log(`   - Platform ID: ${propertyData.platformId}`);

        if (existingProperty) {
          console.log(
            `🔄 UPDATING existing property ${existingProperty.id} for listing ${prop.id}`
          );

          // Update existing property
          const updatedProperty = await storage.updatePropertyByExternalId(
            prop.id,
            propertyData
          );
          if (updatedProperty) {
            console.log(
              `✅ Updated existing property ${updatedProperty.id} for listing ${prop.id}`
            );
            importedProperties.push(updatedProperty);
          }
        } else {
          console.log(`🆕 CREATING new property for listing ${prop.id}`);

          // Create new property
          const newProperty = await storage.createProperty(propertyData);
          console.log(
            `✅ Created new property ${newProperty.id} for listing ${prop.id}`
          );
          importedProperties.push(newProperty);
        }
        importedCount++;
      } catch (error) {
        console.error(`❌ Error importing property ${prop.id}:`, error);
      }
    }

    console.log(`\n🎉 IMPORT COMPLETE!`);
    console.log(`📊 Successfully imported/updated ${importedCount} properties`);
    console.log(
      `📋 Returning ${importedProperties.length} properties in response`
    );

    res.status(200).json(importedProperties);
    console.log(`✨ IMPORT LISTINGS RESPONSE SENT SUCCESSFULLY`);
  } catch (error) {
    console.error(`\n💥 ERROR IN IMPORT CUSTOMER LISTINGS:`);
    console.error(
      `❌ Error Message: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    console.error(`📚 Full Error:`, error);

    res.status(500).json({
      message: "Error importing properties from Hospitable",
      error: error instanceof Error ? error.message : String(error),
    });

    console.log(`❌ ERROR RESPONSE SENT`);
  } finally {
    console.log(
      `🏁 ==================== IMPORT CUSTOMER LISTINGS API END ====================\n`
    );
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

    console.log(
      `[API Route] Fetching images for customer ${customerId}, listing ${listingId}, position ${position}`
    );

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
        console.log(
          `[API Route] Using cached images for listing ${listingId} (updated ${daysDiff.toFixed(
            1
          )} days ago)`
        );

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

      console.log(
        `[API Route] Retrieved ${
          images?.length || 0
        } images for listing ${listingId}`
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
      console.error(
        `[API Route] Error fetching images for listing ${listingId}:`,
        error
      );

      // If we have a property with existing images, return those as fallback
      if (property && property.imageUrl) {
        console.log(
          `[API Route] Falling back to existing images for listing ${listingId}`
        );

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
    console.error("Error fetching property images:", error);
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
          console.warn(
            `Property not found for platformId ${customerId}:${listingId}`
          );
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
        console.error(`Error publishing property ${listingId}:`, error);
      }
    }

    console.log(
      `Successfully marked ${updatedProperties.length} properties for publishing`
    );
    res.status(200).json(updatedProperties);
  } catch (error) {
    console.error("Error marking properties for publishing:", error);
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
  console.log(
    `\n🔗 ==================== HOSPITABLE CONNECT API CALLED ====================`
  );
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🌐 Request URL: ${req.method} ${req.originalUrl}`);
  console.log(`📨 Request Headers:`, JSON.stringify(req.headers, null, 2));

  try {
    const { customerId, code } = req.body;
    const action = (req.query.action as string) || req.body.action;

    console.log(`🎯 Action: ${action}`);
    console.log(`👤 Customer ID: ${customerId}`);
    console.log(
      `🔑 Auth Code: ${code ? `${code.substring(0, 10)}...` : "null"}`
    );
    console.log(`📦 Full Request Body:`, JSON.stringify(req.body, null, 2));

    // Generate auth link for a customer
    if (action === "auth-link" && customerId) {
      console.log(`\n🔗 GENERATING AUTH LINK FOR CUSTOMER: ${customerId}`);

      // Create URL for Hospitable Connect OAuth flow
      const redirectUri =
        process.env.NEXT_PUBLIC_HOSPITABLE_REDIRECT_URI ||
        "http://localhost:5000/auth/callback";
      const clientId = process.env.NEXT_PUBLIC_HOSPITABLE_CLIENT_ID;

      console.log(`🔧 Redirect URI: ${redirectUri}`);
      console.log(
        `🆔 Client ID: ${
          clientId ? `${clientId.substring(0, 10)}...` : "MISSING"
        }`
      );

      if (!clientId) {
        console.error(`❌ MISSING CLIENT ID!`);
        throw new Error(
          "NEXT_PUBLIC_HOSPITABLE_CLIENT_ID environment variable is not set"
        );
      }

      const authUrl = `https://connect.hospitable.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&state=${customerId}`;

      console.log(`✅ Generated Auth URL: ${authUrl}`);
      console.log(`📤 Sending Response: {"authUrl": "${authUrl}"}`);

      res.status(200).json({ authUrl });
      console.log(`✨ AUTH LINK RESPONSE SENT SUCCESSFULLY`);
      return;
    }

    // Create a new customer
    if (action === "customer") {
      console.log(`\n👤 CREATING NEW CUSTOMER IN HOSPITABLE`);
      console.log(`📋 Customer Data:`, JSON.stringify(req.body, null, 2));

      const client = createServerApiClient();
      console.log(`🔗 Hospitable API client created`);

      console.log(`📡 Calling Hospitable API to create customer...`);
      const customerResponse = await client.createCustomer(req.body);
      console.log(
        `✅ Customer created successfully:`,
        JSON.stringify(customerResponse, null, 2)
      );

      // Extract customer data - handle the actual nested structure from Hospitable
      let customer;
      let customerId;

      if (customerResponse.customer && customerResponse.customer.data) {
        // Structure: { customer: { data: { id: "...", ... } } }
        customer = customerResponse.customer.data;
        customerId = customerResponse.customer.data.id;
        console.log(`🔍 Found customer ID in customer.data.id: ${customerId}`);
      } else if (customerResponse.data) {
        // Structure: { data: { id: "...", ... } }
        customer = customerResponse.data;
        customerId = customerResponse.data.id;
        console.log(`🔍 Found customer ID in data.id: ${customerId}`);
      } else {
        // Structure: { id: "...", ... }
        customer = customerResponse;
        customerId = customerResponse.id;
        console.log(`🔍 Found customer ID in root: ${customerId}`);
      }

      console.log(`🆔 Final Extracted Customer ID: ${customerId}`);

      // Also generate auth URL for the newly created customer
      const redirectUri =
        process.env.NEXT_PUBLIC_HOSPITABLE_REDIRECT_URI ||
        "http://localhost:5000/auth/callback";
      const clientId = process.env.NEXT_PUBLIC_HOSPITABLE_CLIENT_ID;

      if (!clientId) {
        console.error(`❌ MISSING CLIENT ID FOR NEW CUSTOMER!`);
        throw new Error(
          "NEXT_PUBLIC_HOSPITABLE_CLIENT_ID environment variable is not set"
        );
      }

      const authUrl = `https://connect.hospitable.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&state=${customerId}`;

      console.log(`🔗 Generated Auth URL for new customer: ${authUrl}`);

      const response = {
        customer: customer,
        customerId: customerId, // Also include at top level for easy access
        authUrl,
      };
      console.log(`📤 Sending Response:`, JSON.stringify(response, null, 2));

      res.status(201).json(response);
      console.log(`✨ CUSTOMER CREATION RESPONSE SENT SUCCESSFULLY`);
      return;
    }

    // Exchange auth code for token
    if (action === "token" && code) {
      console.log(`\n🔑 EXCHANGING AUTH CODE FOR TOKEN`);
      console.log(`🔒 Auth Code: ${code.substring(0, 20)}...`);

      const client = createServerApiClient();
      console.log(`📡 Calling Hospitable API to exchange token...`);

      const tokenResponse = await client.exchangeCodeForToken(code);
      console.log(`✅ Token exchange successful!`);
      console.log(
        `🎫 Access Token: ${
          tokenResponse.access_token
            ? `${tokenResponse.access_token.substring(0, 20)}...`
            : "null"
        }`
      );
      console.log(
        `🔄 Refresh Token: ${
          tokenResponse.refresh_token
            ? `${tokenResponse.refresh_token.substring(0, 20)}...`
            : "null"
        }`
      );
      console.log(`⏰ Expires In: ${tokenResponse.expires_in} seconds`);

      console.log(`📤 Sending Token Response`);
      res.status(200).json(tokenResponse);
      console.log(`✨ TOKEN EXCHANGE RESPONSE SENT SUCCESSFULLY`);
      return;
    }

    console.warn(`⚠️ INVALID ACTION OR MISSING PARAMETERS`);
    console.warn(`🎯 Action: ${action}`);
    console.warn(`👤 Customer ID: ${customerId}`);
    console.warn(`🔑 Code: ${code ? "present" : "missing"}`);

    res
      .status(400)
      .json({ message: "Invalid action or missing required parameters" });

    console.log(`❌ BAD REQUEST RESPONSE SENT`);
  } catch (error) {
    console.error(`\n💥 ERROR IN HOSPITABLE CONNECT:`);
    console.error(
      `❌ Error Message: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    console.error(`📚 Full Error:`, error);

    res.status(500).json({
      message: "Error connecting to Hospitable",
      error: error instanceof Error ? error.message : String(error),
    });

    console.log(`❌ ERROR RESPONSE SENT`);
  } finally {
    console.log(
      `🏁 ==================== HOSPITABLE CONNECT API END ====================\n`
    );
  }
}

// Export controller functions for use in routes
export default {
  importCustomerListings,
  fetchPropertyImages,
  markPropertiesForPublishing,
  connectHospitable,
};
