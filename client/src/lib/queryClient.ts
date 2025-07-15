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

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // More balanced stale time - 5 minutes for most data
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Cache data for 10 minutes before garbage collection
      gcTime: 1000 * 60 * 10, // 10 minutes (replaces cacheTime)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Enhanced caching utilities for different data types
export const getCacheConfig = {
  // Static content that rarely changes (cities, destinations)
  static: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  },

  // Dynamic content that changes frequently (search results, availability)
  dynamic: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  },

  // User-specific content (favorites, bookings)
  user: {
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  },

  // Real-time content (reviews, availability)
  realtime: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 2, // 2 minutes
  },
};
