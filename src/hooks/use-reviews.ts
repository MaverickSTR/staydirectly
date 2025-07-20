import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  getCacheConfig,
  optimisticUpdates,
  createCacheKey,
} from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

// Types for review data
export interface Review {
  id: number;
  propertyId: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
  avatar?: string;
  verified?: boolean;
}

export interface ReviewWidget {
  id: string;
  propertyId: number;
  widgetCode: string;
  widgetType: "revyoos" | "airbnb" | "custom";
  isActive: boolean;
  lastUpdated: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  recentReviews: Review[];
}

// Enhanced hook for fetching property reviews with optimized caching
export function usePropertyReviews(
  propertyId: number,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: [`/api/properties/${propertyId}/reviews`],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/properties/${propertyId}/reviews`
      );
      return response.json();
    },
    enabled: options?.enabled ?? !!propertyId,
    ...getCacheConfig.reviews,
    staleTime: options?.staleTime ?? getCacheConfig.reviews.staleTime,
    refetchInterval:
      options?.refetchInterval ?? getCacheConfig.reviews.refetchInterval,
  });
}

// Hook for fetching review statistics
export function useReviewStats(propertyId: number) {
  return useQuery({
    queryKey: [`/api/properties/${propertyId}/reviews/stats`],
    queryFn: async (): Promise<ReviewStats> => {
      const response = await apiRequest(
        "GET",
        `/api/properties/${propertyId}/reviews/stats`
      );
      return response.json();
    },
    enabled: !!propertyId,
    ...getCacheConfig.reviews,
  });
}

// Hook for infinite scrolling reviews
export function useInfiniteReviews(propertyId: number, pageSize: number = 10) {
  return useInfiniteQuery({
    queryKey: [`/api/properties/${propertyId}/reviews`, "infinite"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiRequest(
        "GET",
        `/api/properties/${propertyId}/reviews?page=${pageParam}&limit=${pageSize}`
      );
      return response.json();
    },
    enabled: !!propertyId,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    ...getCacheConfig.reviews,
  });
}

// Hook for creating a new review with optimistic updates
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewData: Omit<Review, "id" | "date">) => {
      const response = await apiRequest("POST", "/api/reviews", reviewData);
      return response.json();
    },
    onMutate: async (newReview) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [`/api/properties/${newReview.propertyId}/reviews`],
      });

      // Snapshot the previous value
      const previousReviews = queryClient.getQueryData([
        `/api/properties/${newReview.propertyId}/reviews`,
      ]);

      // Optimistically update to the new value
      optimisticUpdates.updateReviewOptimistically(
        newReview.propertyId,
        { ...newReview, id: Date.now(), date: new Date().toISOString() },
        queryClient
      );

      // Return a context object with the snapshotted value
      return { previousReviews };
    },
    onError: (err, newReview, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousReviews) {
        queryClient.setQueryData(
          [`/api/properties/${newReview.propertyId}/reviews`],
          context.previousReviews
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: [`/api/properties/${variables.propertyId}/reviews`],
      });
    },
  });
}

// Hook for updating a review
export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<Review>;
    }) => {
      const response = await apiRequest("PATCH", `/api/reviews/${id}`, updates);
      return response.json();
    },
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["/api/reviews"],
      });

      // Snapshot the previous value
      const previousReviews = queryClient.getQueryData(["/api/reviews"]);

      // Optimistically update
      queryClient.setQueryData(["/api/reviews"], (old: any) => {
        if (!old) return old;
        return old.map((review: Review) =>
          review.id === id ? { ...review, ...updates } : review
        );
      });

      return { previousReviews };
    },
    onError: (err, variables, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(["/api/reviews"], context.previousReviews);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    },
  });
}

// Hook for deleting a review
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: number) => {
      const response = await apiRequest("DELETE", `/api/reviews/${reviewId}`);
      return response.json();
    },
    onMutate: async (reviewId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/reviews"] });

      const previousReviews = queryClient.getQueryData(["/api/reviews"]);

      queryClient.setQueryData(["/api/reviews"], (old: any) => {
        if (!old) return old;
        return old.filter((review: Review) => review.id !== reviewId);
      });

      return { previousReviews };
    },
    onError: (err, reviewId, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(["/api/reviews"], context.previousReviews);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    },
  });
}

// Hook for managing review widgets
export function useReviewWidgets(propertyId?: number) {
  return useQuery({
    queryKey: propertyId
      ? [`/api/properties/${propertyId}/widgets`]
      : ["/api/review-widgets"],
    queryFn: async () => {
      const url = propertyId
        ? `/api/properties/${propertyId}/widgets`
        : "/api/review-widgets";
      const response = await apiRequest("GET", url);
      return response.json();
    },
    enabled: !!propertyId || true, // Always enabled for global widgets
    ...getCacheConfig.widgets,
  });
}

// Hook for updating review widget configuration
export function useUpdateReviewWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      propertyId,
      widgetData,
    }: {
      propertyId: number;
      widgetData: Partial<ReviewWidget>;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/properties/${propertyId}/widgets`,
        widgetData
      );
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: [`/api/properties/${variables.propertyId}/widgets`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/properties/${variables.propertyId}`],
      });
    },
  });
}

// Hook for testing review widget functionality
export function useTestReviewWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      propertyId,
      widgetCode,
    }: {
      propertyId: number;
      widgetCode: string;
    }) => {
      const response = await apiRequest("POST", "/api/review-widgets/test", {
        propertyId,
        widgetCode,
      });
      return response.json();
    },
  });
}

// Hook for bulk review operations
export function useBulkReviewOperations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      operation,
      reviewIds,
    }: {
      operation: "approve" | "reject" | "delete";
      reviewIds: number[];
    }) => {
      const response = await apiRequest("POST", "/api/reviews/bulk", {
        operation,
        reviewIds,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all review-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
    },
  });
}

// Hook for review analytics and insights
export function useReviewAnalytics(
  propertyId?: number,
  dateRange?: {
    start: string;
    end: string;
  }
) {
  const cacheKey = createCacheKey("/api/reviews/analytics", {
    propertyId,
    dateRange,
  });

  return useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (propertyId) params.append("propertyId", propertyId.toString());
      if (dateRange) {
        params.append("start", dateRange.start);
        params.append("end", dateRange.end);
      }

      const response = await apiRequest(
        "GET",
        `/api/reviews/analytics?${params.toString()}`
      );
      return response.json();
    },
    enabled: !!propertyId || !!dateRange,
    ...getCacheConfig.dynamic,
  });
}

// Hook for review moderation queue
export function useReviewModerationQueue(
  status?: "pending" | "approved" | "rejected"
) {
  const cacheKey = createCacheKey("/api/reviews/moderation", { status });

  return useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);

      const response = await apiRequest(
        "GET",
        `/api/reviews/moderation?${params.toString()}`
      );
      return response.json();
    },
    ...getCacheConfig.dynamic,
  });
}

// Utility hook for review search and filtering
export function useReviewSearch(
  query: string,
  filters?: {
    rating?: number;
    dateRange?: { start: string; end: string };
    verified?: boolean;
  }
) {
  const cacheKey = createCacheKey("/api/reviews/search", { query, filters });

  return useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (filters) {
        if (filters.rating) params.append("rating", filters.rating.toString());
        if (filters.verified !== undefined)
          params.append("verified", filters.verified.toString());
        if (filters.dateRange) {
          params.append("start", filters.dateRange.start);
          params.append("end", filters.dateRange.end);
        }
      }

      const response = await apiRequest(
        "GET",
        `/api/reviews/search?${params.toString()}`
      );
      return response.json();
    },
    enabled: !!query || !!filters,
    ...getCacheConfig.dynamic,
  });
}
