import axios from "axios";
import { queryClient, getCacheConfig } from "./queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// API client for communicating with Hospitable and our backend API
class HospitableApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = "/api/hospitable";
  }

  /**
   * Create a customer in Hospitable
   */
  async createCustomer(customerData: any): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/connect`, {
        action: "customer",
        ...customerData,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  }

  /**
   * Generate an auth link for Hospitable Connect OAuth flow
   */
  async generateAuthLink(customerId: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/connect`, {
        action: "auth-link",
        customerId,
      });
      return response.data.authUrl;
    } catch (error) {
      console.error("Error generating auth link:", error);
      throw error;
    }
  }

  /**
   * Exchange auth code for token
   */
  async exchangeCodeForToken(code: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/connect`, {
        action: "token",
        code,
      });
      return response.data;
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      throw error;
    }
  }

  /**
   * Get customer listings from Hospitable
   */
  async getCustomerListings(customerId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/customers/${customerId}/listings`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching listings for customer ${customerId}:`,
        error
      );
      return []; // Return empty array on error
    }
  }

  /**
   * Import customer listings into our database
   */
  async importListings(
    customerId: string,
    shouldAvoidUpdate = false
  ): Promise<any[]> {
    try {
      const response = await axios.post(`/api/hospitable/import-listings`, {
        customerId,
        shouldAvoidUpdateForCustomer: shouldAvoidUpdate,
      });

      // Invalidate property queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties/featured"] });

      return response.data;
    } catch (error) {
      console.error(
        `Error importing listings for customer ${customerId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Fetch and store property images for a customer's listings
   */
  async fetchPropertyImages(
    customerId: string,
    listingId: string,
    position?: number,
    shouldUpdateCached = false
  ): Promise<any> {
    try {
      const response = await axios.post(`/api/hospitable/fetch-images`, {
        customerId,
        listingId,
        position: position || 0,
        shouldUpdateCachedImages: shouldUpdateCached,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching images for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Mark properties as published
   */
  async markListingsForPublishing(
    customerId: string,
    listingIds: string[]
  ): Promise<any> {
    try {
      const response = await axios.post(`/api/hospitable/mark-for-publishing`, {
        customerId,
        listingIds,
      });

      // Invalidate property queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties/featured"] });

      return response.data;
    } catch (error) {
      console.error(
        `Error publishing listings for customer ${customerId}:`,
        error
      );
      throw error;
    }
  }
}

// Export singleton instance
export const hospitable = new HospitableApiClient();

// ============================================
// OPTIMIZED HOOKS FOR CACHING
// ============================================

/**
 * Hook for fetching all properties with optimized caching
 */
export function useProperties() {
  return useQuery({
    queryKey: ["/api/properties"],
    queryFn: getAllProperties,
    ...getCacheConfig.static,
  });
}

/**
 * Hook for fetching featured properties with optimized caching
 */
export function useFeaturedProperties() {
  return useQuery({
    queryKey: ["/api/properties/featured"],
    queryFn: getFeaturedProperties,
    ...getCacheConfig.static,
  });
}

/**
 * Hook for fetching a single property with optimized caching
 */
export function useProperty(id: number) {
  return useQuery({
    queryKey: [`/api/properties/${id}`],
    queryFn: () => getProperty(id),
    enabled: !!id,
    ...getCacheConfig.static,
  });
}

/**
 * Hook for searching properties with dynamic caching
 */
export function useSearchProperties(query: string, filters?: any) {
  return useQuery({
    queryKey: ["/api/properties/search", query, filters],
    queryFn: () => searchProperties(query, filters),
    enabled: !!query,
    ...getCacheConfig.dynamic,
  });
}

/**
 * Hook for fetching cities with static caching
 */
export function useCities() {
  return useQuery({
    queryKey: ["/api/cities"],
    queryFn: getAllCities,
    ...getCacheConfig.static,
  });
}

/**
 * Hook for fetching featured cities with static caching
 */
export function useFeaturedCities() {
  return useQuery({
    queryKey: ["/api/cities/featured"],
    queryFn: getFeaturedCities,
    ...getCacheConfig.static,
  });
}

/**
 * Hook for fetching a single city with static caching
 */
export function useCity(name: string) {
  return useQuery({
    queryKey: [`/api/cities/${name}`],
    queryFn: () => getCity(name),
    enabled: !!name,
    ...getCacheConfig.static,
  });
}

/**
 * Hook for fetching city properties with static caching
 */
export function useCityProperties(cityName: string) {
  return useQuery({
    queryKey: [`/api/cities/${cityName}/properties`],
    queryFn: () => getCityProperties(cityName),
    enabled: !!cityName,
    ...getCacheConfig.static,
  });
}

/**
 * Hook for fetching property reviews with real-time caching
 */
export function usePropertyReviews(propertyId: number) {
  return useQuery({
    queryKey: [`/api/properties/${propertyId}/reviews`],
    queryFn: () => getPropertyReviews(propertyId),
    enabled: !!propertyId,
    ...getCacheConfig.realtime,
  });
}

/**
 * Custom hook for prefetching commonly needed data
 */
export function usePrefetchCommonData() {
  const queryClient = useQueryClient();

  const prefetchFeaturedData = () => {
    // Prefetch featured properties
    queryClient.prefetchQuery({
      queryKey: ["/api/properties/featured"],
      queryFn: getFeaturedProperties,
      ...getCacheConfig.static,
    });

    // Prefetch featured cities
    queryClient.prefetchQuery({
      queryKey: ["/api/cities/featured"],
      queryFn: getFeaturedCities,
      ...getCacheConfig.static,
    });
  };

  const prefetchPropertyDetails = (propertyId: number) => {
    // Prefetch property details
    queryClient.prefetchQuery({
      queryKey: [`/api/properties/${propertyId}`],
      queryFn: () => getProperty(propertyId),
      ...getCacheConfig.static,
    });

    // Prefetch property reviews
    queryClient.prefetchQuery({
      queryKey: [`/api/properties/${propertyId}/reviews`],
      queryFn: () => getPropertyReviews(propertyId),
      ...getCacheConfig.realtime,
    });
  };

  return {
    prefetchFeaturedData,
    prefetchPropertyDetails,
  };
}

// ============================================
// PROPERTIES API (Keep existing functions for backward compatibility)
// ============================================

export async function getAllProperties(): Promise<any[]> {
  try {
    const response = await axios.get("/api/properties");
    return response.data;
  } catch (error) {
    console.error("Error fetching all properties:", error);
    return [];
  }
}

export async function getFeaturedProperties(): Promise<any[]> {
  try {
    const response = await axios.get("/api/properties/featured");
    console.log("getFeaturedProperties response:", response);
    console.log("getFeaturedProperties response.data:", response.data);
    console.log(
      "getFeaturedProperties response.data type:",
      typeof response.data
    );
    console.log(
      "getFeaturedProperties response.data isArray:",
      Array.isArray(response.data)
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching featured properties:", error);
    return [];
  }
}

export async function searchProperties(
  query: string,
  filters?: any
): Promise<any[]> {
  console.log("API - searchProperties called with:");
  console.log("API - query:", query);
  console.log("API - filters:", filters);

  const params = new URLSearchParams({ q: query });

  if (filters && Object.keys(filters).length > 0) {
    console.log("API - Adding filters to params:", JSON.stringify(filters));
    params.append("filters", JSON.stringify(filters));
  }

  console.log("API - Final params string:", params.toString());

  try {
    const response = await axios.get(
      `/api/properties/search?${params.toString()}`
    );
    console.log(
      "API - Response received:",
      response.data?.length,
      "properties"
    );
    return response.data;
  } catch (error) {
    console.error("Error searching properties:", error);
    return [];
  }
}

export async function getProperty(id: number): Promise<any> {
  try {
    const response = await axios.get(`/api/properties/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching property ${id}:`, error);
    throw error;
  }
}

export async function createProperty(propertyData: any): Promise<any> {
  try {
    const response = await axios.post("/api/properties", propertyData);

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    queryClient.invalidateQueries({ queryKey: ["/api/properties/featured"] });

    return response.data;
  } catch (error) {
    console.error("Error creating property:", error);
    throw error;
  }
}

export async function updateProperty(
  id: number,
  updateData: any
): Promise<any> {
  try {
    const response = await axios.patch(`/api/properties/${id}`, updateData);

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    queryClient.invalidateQueries({ queryKey: ["/api/properties/featured"] });
    queryClient.invalidateQueries({ queryKey: [`/api/properties/${id}`] });

    return response.data;
  } catch (error) {
    console.error(`Error updating property ${id}:`, error);
    throw error;
  }
}

export async function deleteProperty(id: number): Promise<any> {
  try {
    const response = await axios.delete(`/api/properties/${id}`);

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    queryClient.invalidateQueries({ queryKey: ["/api/properties/featured"] });

    return response.data;
  } catch (error) {
    console.error(`Error deleting property ${id}:`, error);
    throw error;
  }
}

// ============================================
// CITIES API
// ============================================

export async function getAllCities(): Promise<any[]> {
  try {
    const response = await axios.get("/api/cities");
    return response.data;
  } catch (error) {
    console.error("Error fetching all cities:", error);
    return [];
  }
}

export async function getFeaturedCities(): Promise<any[]> {
  try {
    const response = await axios.get("/api/cities/featured");
    return response.data;
  } catch (error) {
    console.error("Error fetching featured cities:", error);
    return [];
  }
}

export async function getCity(name: string): Promise<any> {
  try {
    const response = await axios.get(`/api/cities/${encodeURIComponent(name)}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching city ${name}:`, error);
    throw error;
  }
}

export async function createCity(cityData: any): Promise<any> {
  try {
    const response = await axios.post("/api/cities", cityData);

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ["/api/cities"] });
    queryClient.invalidateQueries({ queryKey: ["/api/cities/featured"] });

    return response.data;
  } catch (error) {
    console.error("Error creating city:", error);
    throw error;
  }
}

export async function getCityProperties(cityName: string): Promise<any[]> {
  try {
    const response = await axios.get(
      `/api/cities/${encodeURIComponent(cityName)}/properties`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching properties for city ${cityName}:`, error);
    return [];
  }
}

// TODO: Implement neighborhoods endpoint in backend
export async function getNeighborhoods(cityId: number): Promise<any[]> {
  try {
    // Placeholder function - neighborhoods endpoint not yet implemented in backend
    console.warn(
      `getNeighborhoods called for city ${cityId} but endpoint not implemented`
    );
    return [];
  } catch (error) {
    console.error(`Error fetching neighborhoods for city ID ${cityId}:`, error);
    return [];
  }
}

// ============================================
// MAPS & PLACES API
// ============================================

export async function getNearbyPlaces(
  latitude: number,
  longitude: number,
  type?: string,
  radius?: number
): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
    });

    if (type) params.append("type", type);
    if (radius) params.append("radius", radius.toString());

    const response = await axios.get(`/api/nearby?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching nearby places:", error);
    return [];
  }
}

// ============================================
// REVIEWS API
// ============================================

export async function getPropertyReviews(propertyId: number): Promise<any[]> {
  try {
    const response = await axios.get(`/api/properties/${propertyId}/reviews`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching reviews for property ${propertyId}:`, error);
    return [];
  }
}

export async function createReview(reviewData: any): Promise<any> {
  try {
    const response = await axios.post("/api/reviews", reviewData);

    // Invalidate relevant queries
    queryClient.invalidateQueries({
      queryKey: [`/api/properties/${reviewData.propertyId}/reviews`],
    });

    return response.data;
  } catch (error) {
    console.error("Error creating review:", error);
    throw error;
  }
}

// ============================================
// FAVORITES API
// ============================================

export async function addFavorite(
  userId: number,
  propertyId: number
): Promise<any> {
  try {
    const response = await axios.post("/api/favorites", { userId, propertyId });

    // Invalidate favorites queries to refresh data
    queryClient.invalidateQueries({
      queryKey: ["/api/users", userId, "favorites"],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/favorites/check"] });

    return response.data;
  } catch (error) {
    console.error("Error adding favorite:", error);
    throw error;
  }
}

export async function removeFavorite(
  userId: number,
  propertyId: number
): Promise<any> {
  try {
    const response = await axios.delete("/api/favorites", {
      data: { userId, propertyId },
    });

    // Invalidate favorites queries to refresh data
    queryClient.invalidateQueries({
      queryKey: ["/api/users", userId, "favorites"],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/favorites/check"] });

    return response.data;
  } catch (error) {
    console.error("Error removing favorite:", error);
    throw error;
  }
}

export async function checkFavoriteStatus(
  userId: number,
  propertyId: number
): Promise<any> {
  try {
    const response = await axios.get("/api/favorites/check", {
      params: { userId, propertyId },
    });
    return response.data;
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return { isFavorite: false };
  }
}
