import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Request deduplication map to prevent duplicate simultaneous calls
const ongoingRequests = new Map<string, Promise<any>>();

export function createDedupedRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  if (ongoingRequests.has(key)) {
    return ongoingRequests.get(key)!;
  }

  const promise = requestFn().finally(() => {
    ongoingRequests.delete(key);
  });

  ongoingRequests.set(key, promise);
  return promise;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const url = queryKey[0] as string;

    // Create deduped request to prevent multiple simultaneous calls to same endpoint
    return createDedupedRequest(url, async () => {
      const res = await fetch(url, {
        credentials: "include",
        signal, // Support query cancellation
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    });
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Background refetching strategies - optimized for cache persistence
      refetchOnWindowFocus: false, // Prevent unnecessary refetches on window focus
      refetchOnReconnect: true,
      refetchInterval: false, // Disable automatic polling by default

      // Enhanced caching for better performance and persistence
      staleTime: 1000 * 60 * 10, // 10 minutes - data stays fresh longer
      gcTime: 1000 * 60 * 60 * 2, // 2 hours - keep data in cache much longer

      // Network and retry configuration
      networkMode: "online", // Only run queries when online
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.message?.includes("4")) return false;
        // Retry up to 2 times for network/server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
      retryDelay: 1000,
      networkMode: "online",
    },
  },
});

// Enhanced caching utilities for different data types
export const getCacheConfig = {
  // Static content that rarely changes (cities, destinations, property details)
  static: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 6, // 6 hours
    refetchOnWindowFocus: false, // Don't refetch static data on focus
    refetchInterval: 1000 * 60 * 60, // Refresh every hour in background
  },

  // Semi-static content that changes occasionally (featured properties, property lists)
  semiStatic: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 30, // Refresh every 30 minutes in background
  },

  // Dynamic content that changes frequently (search results, availability)
  dynamic: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
    refetchInterval: false as const, // Let user actions trigger updates
  },

  // User-specific content (favorites, bookings, personal data)
  user: {
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: true,
    refetchInterval: false as const,
  },

  // Real-time content (reviews, live availability, notifications)
  realtime: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
  },

  // Long-term cache for rarely changing data (configuration, static content)
  longTerm: {
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 60 * 4, // Refresh every 4 hours
  },

  // Review-specific caching with optimistic updates
  reviews: {
    staleTime: 1000 * 60 * 5, // 5 minutes - reviews change frequently
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
    // Optimistic updates for better UX
    placeholderData: (previousData: any) => previousData,
  },

  // Widget-specific caching for external review widgets
  widgets: {
    staleTime: 1000 * 60 * 15, // 15 minutes - widgets are expensive to load
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false, // Don't refetch widgets on focus
    refetchInterval: false as const, // Manual refresh only
    retry: (failureCount: number, error: any) => {
      // Retry widget loading more aggressively
      if (error?.message?.includes("4")) return false;
      return failureCount < 3;
    },
  },
};

// Utility function to create optimized cache keys
export function createCacheKey(
  endpoint: string,
  params?: Record<string, any>
): string[] {
  const baseKey = [endpoint];
  if (params && Object.keys(params).length > 0) {
    // Sort params for consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);
    baseKey.push(JSON.stringify(sortedParams));
  }
  return baseKey;
}

// Enhanced cache warming utilities with review-specific optimizations
export const cacheWarmers = {
  // Prefetch essential data on app startup
  async warmEssentialData() {
    // Featured properties and cities - most commonly accessed
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ["/api/properties/featured"],
        queryFn: getQueryFn({ on401: "throw" }),
        ...getCacheConfig.semiStatic,
      }),
      queryClient.prefetchQuery({
        queryKey: ["/api/cities/featured"],
        queryFn: getQueryFn({ on401: "throw" }),
        ...getCacheConfig.static,
      }),
    ]);
  },

  // Prefetch data based on user navigation patterns
  async warmNavigationData(propertyId?: number, cityName?: string) {
    const prefetchPromises: Promise<any>[] = [];

    if (propertyId) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: [`/api/properties/${propertyId}`],
          queryFn: getQueryFn({ on401: "throw" }),
          ...getCacheConfig.static,
        }),
        queryClient.prefetchQuery({
          queryKey: [`/api/properties/${propertyId}/reviews`],
          queryFn: getQueryFn({ on401: "throw" }),
          ...getCacheConfig.reviews,
        })
      );
    }

    if (cityName) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: [`/api/cities/${encodeURIComponent(cityName)}`],
          queryFn: getQueryFn({ on401: "throw" }),
          ...getCacheConfig.static,
        }),
        queryClient.prefetchQuery({
          queryKey: [`/api/cities/${encodeURIComponent(cityName)}/properties`],
          queryFn: getQueryFn({ on401: "throw" }),
          ...getCacheConfig.semiStatic,
        })
      );
    }

    await Promise.allSettled(prefetchPromises);
  },

  // Prefetch review widget data for better performance
  async warmReviewWidgets(propertyIds: number[]) {
    const prefetchPromises = propertyIds.map((propertyId) =>
      queryClient.prefetchQuery({
        queryKey: [`/api/properties/${propertyId}/reviews`],
        queryFn: getQueryFn({ on401: "throw" }),
        ...getCacheConfig.reviews,
      })
    );

    await Promise.allSettled(prefetchPromises);
  },
};

// Optimistic update utilities for better UX
export const optimisticUpdates = {
  // Optimistically update review data
  updateReviewOptimistically(
    propertyId: number,
    newReview: any,
    queryClient: any
  ) {
    queryClient.setQueryData(
      [`/api/properties/${propertyId}/reviews`],
      (oldData: any) => {
        if (!oldData) return [newReview];
        return [newReview, ...oldData];
      }
    );
  },

  // Optimistically update property data
  updatePropertyOptimistically(
    propertyId: number,
    updates: any,
    queryClient: any
  ) {
    queryClient.setQueryData(
      [`/api/properties/${propertyId}`],
      (oldData: any) => {
        if (!oldData) return updates;
        return { ...oldData, ...updates };
      }
    );
  },

  // Optimistically update favorites
  updateFavoriteOptimistically(
    propertyId: number,
    isFavorite: boolean,
    queryClient: any
  ) {
    // Update the property's favorite status
    queryClient.setQueryData(
      [`/api/properties/${propertyId}`],
      (oldData: any) => {
        if (!oldData) return { isFavorite };
        return { ...oldData, isFavorite };
      }
    );

    // Update favorites list if it exists
    queryClient.setQueryData(["/api/favorites"], (oldData: any) => {
      if (!oldData) return isFavorite ? [propertyId] : [];
      if (isFavorite) {
        return oldData.includes(propertyId)
          ? oldData
          : [...oldData, propertyId];
      } else {
        return oldData.filter((id: number) => id !== propertyId);
      }
    });
  },
};

// Background sync utilities for offline support
export const backgroundSync = {
  // Queue mutations for when connection is restored
  queueMutation: (mutation: any) => {
    const queue = JSON.parse(localStorage.getItem("mutationQueue") || "[]");
    queue.push(mutation);
    localStorage.setItem("mutationQueue", JSON.stringify(queue));
  },

  // Process queued mutations when online
  processQueuedMutations: async (queryClient: any) => {
    const queue = JSON.parse(localStorage.getItem("mutationQueue") || "[]");
    if (queue.length === 0) return;

    for (const mutation of queue) {
      try {
        await queryClient.executeMutation(mutation);
      } catch (error) {
        console.error("Failed to process queued mutation:", error);
      }
    }

    localStorage.setItem("mutationQueue", "[]");
  },
};
