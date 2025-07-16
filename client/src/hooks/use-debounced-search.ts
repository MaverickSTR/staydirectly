import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchProperties } from "../lib/api";
import { getCacheConfig, createCacheKey } from "../lib/queryClient";

/**
 * Custom hook for debounced search with intelligent caching
 * Prevents excessive API calls while typing
 */
export function useDebouncedSearch(
  query: string,
  filters?: any,
  debounceMs: number = 300
) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Debounce the filters separately (might want different timing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, debounceMs / 2); // Faster debounce for filters

    return () => clearTimeout(timer);
  }, [filters, debounceMs]);

  // Create optimized cache key
  const cacheKey = useMemo(
    () =>
      createCacheKey("/api/properties/search", {
        query: debouncedQuery,
        filters: debouncedFilters,
      }),
    [debouncedQuery, debouncedFilters]
  );

  // Only execute search if there's a meaningful query or filters
  const shouldSearch = useMemo(() => {
    const hasQuery = debouncedQuery && debouncedQuery.trim().length >= 2;
    const hasFilters =
      debouncedFilters && Object.keys(debouncedFilters).length > 0;
    return hasQuery || hasFilters;
  }, [debouncedQuery, debouncedFilters]);

  const queryResult = useQuery({
    queryKey: cacheKey,
    queryFn: () => searchProperties(debouncedQuery, debouncedFilters),
    enabled: shouldSearch,
    ...getCacheConfig.dynamic,
    // Additional optimizations for search
    staleTime: 1000 * 60 * 1, // 1 minute for search results
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    ...queryResult,
    // Return both original and debounced values for UI feedback
    originalQuery: query,
    debouncedQuery,
    originalFilters: filters,
    debouncedFilters,
    isDebouncing:
      query !== debouncedQuery ||
      JSON.stringify(filters) !== JSON.stringify(debouncedFilters),
  };
}

/**
 * Hook for instant search suggestions (highly cached, minimal API calls)
 */
export function useSearchSuggestions(query: string, limit: number = 5) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150); // Faster debounce for suggestions

    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ["/api/search/suggestions", debouncedQuery, limit],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];

      // This would call a lightweight suggestions endpoint
      // For now, we'll use the main search but limit results
      const results = await searchProperties(debouncedQuery);
      return results.slice(0, limit);
    },
    enabled: debouncedQuery.length >= 2,
    ...getCacheConfig.dynamic,
    staleTime: 1000 * 60 * 10, // 10 minutes for suggestions
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook for property autocomplete (cities, locations, etc.)
 */
export function useAutocomplete(
  query: string,
  type: "cities" | "locations" | "properties" = "cities",
  limit: number = 8
) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ["/api/autocomplete", type, debouncedQuery, limit],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 1) return [];

      // This would call a specific autocomplete endpoint
      // For now, we'll simulate with existing endpoints
      if (type === "cities") {
        // Would call /api/cities/autocomplete
        return [];
      }

      return [];
    },
    enabled: debouncedQuery.length >= 1,
    ...getCacheConfig.static, // Autocomplete data is relatively static
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  });
}
