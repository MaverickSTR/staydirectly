// property-utils.ts
import { hospitable } from "@/lib/api";
import { PropertyImage } from "./types";

/**
 * Fetches property images for a specific customer and listing through our backend
 * @param customerId The Hospitable customer ID
 * @param listingId The Hospitable listing ID
 * @param position Optional position parameter
 * @param shouldUpdateCached Whether to force update cached images
 * @returns Property image data from our backend
 */
export async function fetchPropertyImages(
  customerId: string,
  listingId: string,
  position?: number,
  shouldUpdateCached = false
): Promise<any> {
  try {
    console.log(
      `Fetching images through backend for customer ${customerId}, listing ${listingId}`
    );

    // Use our backend API instead of direct Hospitable calls
    const result = await hospitable.fetchPropertyImages(
      customerId,
      listingId,
      position,
      shouldUpdateCached
    );

    console.log(`Backend API call successful!`, result);
    return result;
  } catch (error) {
    console.error(`Error fetching images through backend:`, error);
    throw error;
  }
}

/**
 * Fetches the main/primary image for a property
 * @param customerId The Hospitable customer ID
 * @param listingId The Hospitable listing ID
 * @returns The primary image URL or undefined
 */
export async function fetchPropertyMainImage(
  customerId: string,
  listingId: string
): Promise<string | undefined> {
  try {
    const result = await fetchPropertyImages(customerId, listingId);
    // The backend returns an object with mainImage and additionalImages
    return result?.mainImage || undefined;
  } catch (error) {
    console.error("Failed to fetch property main image:", error);
    return undefined;
  }
}

/**
 * Optimizes a muscache.com URL to get a higher quality version
 * @param url The original image URL from Airbnb/muscache.com
 * @returns Optimized high-quality URL
 */
export function getOptimizedAirbnbImageUrl(url: string): string {
  if (!url) return "";

  // Only process muscache.com URLs
  if (url.includes("muscache.com")) {
    // First, convert /im/ URLs to direct URLs for higher quality
    let optimizedUrl = url;

    if (url.includes("/im/")) {
      optimizedUrl = url.replace(
        "https://a0.muscache.com/im/",
        "https://a0.muscache.com/"
      );
    }

    // Then ensure we're using the large policy for better resolution
    if (optimizedUrl.includes("aki_policy=")) {
      optimizedUrl = optimizedUrl.replace(
        /aki_policy=[^&]+/,
        "aki_policy=large"
      );
    } else {
      // Add large policy if it doesn't exist
      optimizedUrl =
        optimizedUrl +
        (optimizedUrl.includes("?") ? "&" : "?") +
        "aki_policy=large";
    }

    return optimizedUrl;
  }

  // Return original URL if not a muscache.com URL
  return url;
}

/**
 * Extracts the customer ID and listing ID from a property's platformId
 * @param platformId The platformId from the property object (format can be "customerId/listingId" or "customerId:listingId")
 * @returns Object containing customerId and listingId
 */
export function extractPropertyIds(platformId: string | null): {
  customerId: string | null;
  listingId: string | null;
} {
  if (!platformId) {
    return { customerId: null, listingId: null };
  }

  // Handle different format possibilities:
  // 1. Direct ID with no customer prefix (legacy format)
  // 2. CustomerID/ListingID or CustomerID:ListingID format (new formats)
  let parts: string[];

  if (platformId.includes("/")) {
    parts = platformId.split("/");
  } else if (platformId.includes(":")) {
    parts = platformId.split(":");
  } else {
    // Single ID with no delimiter
    return { customerId: null, listingId: platformId };
  }

  if (parts.length === 2) {
    // Format with customerId and listingId
    return { customerId: parts[0], listingId: parts[1] };
  }

  // Invalid format or single value, return as listingId
  return { customerId: null, listingId: platformId };
}
