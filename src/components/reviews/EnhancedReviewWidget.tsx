import React, { useState, useEffect } from 'react';
import { usePropertyReviews, useReviewStats, useCreateReview } from '@/hooks/use-reviews';
import { useProperty } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageCircle, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import { RevyoosDirectEmbed, ReviewFallback } from './index';

interface EnhancedReviewWidgetProps {
  propertyId: number;
  className?: string;
  showStats?: boolean;
  showCreateReview?: boolean;
  maxReviews?: number;
}

/**
 * Enhanced review widget with React Query optimizations
 * Features:
 * - Optimistic updates for new reviews
 * - Intelligent caching with review-specific config
 * - Fallback to sample reviews if external widget fails
 * - Review statistics and analytics
 * - Real-time updates
 */
const EnhancedReviewWidget: React.FC<EnhancedReviewWidgetProps> = ({
  propertyId,
  className = "w-full",
  showStats = true,
  showCreateReview = true,
  maxReviews = 10
}) => {
  const { toast } = useToast();
  const [reviewMode, setReviewMode] = useState<'widget' | 'fallback'>('widget');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    author: ''
  });

  // Enhanced React Query hooks with optimistic updates
  const { 
    data: reviews = [], 
    isLoading: reviewsLoading, 
    error: reviewsError,
    refetch: refetchReviews 
  } = usePropertyReviews(propertyId, {
    staleTime: 1000 * 60 * 2, // 2 minutes for reviews
    refetchInterval: 1000 * 60 * 5 // Refresh every 5 minutes
  });

  const { 
    data: reviewStats, 
    isLoading: statsLoading 
  } = useReviewStats(propertyId);

  const { 
    data: property, 
    isLoading: propertyLoading 
  } = useProperty(propertyId);

  // Mutation for creating reviews with optimistic updates
  const createReviewMutation = useCreateReview();

  // Handle widget loading failures
  useEffect(() => {
    if (reviewsError && reviewMode === 'widget') {
      console.warn('Review widget failed to load, switching to fallback');
      setReviewMode('fallback');
    }
  }, [reviewsError, reviewMode]);

  // Handle successful review creation
  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReview.comment.trim() || !newReview.author.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createReviewMutation.mutateAsync({
        propertyId,
        author: newReview.author,
        rating: newReview.rating,
        comment: newReview.comment,
        date: new Date().toISOString()
      });

      toast({
        title: "Review Submitted",
        description: "Thank you for your review! It will appear shortly.",
      });

      // Reset form
      setNewReview({ rating: 5, comment: '', author: '' });
      setShowCreateForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Loading state
  if (propertyLoading || reviewsLoading) {
    return (
      <div className={`${className} space-y-4`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (reviewsError && reviewMode === 'fallback') {
    return (
      <div className={`${className} space-y-4`}>
        <div className="text-center p-6 border rounded-lg bg-gray-50">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Reviews Temporarily Unavailable
          </h3>
          <p className="text-gray-500 mb-4">
            We're having trouble loading reviews right now.
          </p>
          <Button 
            onClick={() => refetchReviews()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Review Statistics */}
      {showStats && reviewStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Review Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {reviewStats.averageRating.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {reviewStats.totalReviews}
                </div>
                <div className="text-sm text-gray-500">Total Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((reviewStats.ratingDistribution[5] || 0) / reviewStats.totalReviews * 100)}%
                </div>
                <div className="text-sm text-gray-500">5-Star Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {reviewStats.recentReviews.length}
                </div>
                <div className="text-sm text-gray-500">Recent Reviews</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Widget or Fallback */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Guest Reviews
              {property?.reviewWidgetCode && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  External Widget
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchReviews()}
                disabled={reviewsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${reviewsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {reviewMode === 'widget' && reviewsError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewMode('fallback')}
                >
                  Show Sample Reviews
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reviewMode === 'widget' && property?.reviewWidgetCode ? (
            <RevyoosDirectEmbed 
              reviewWidgetCode={property.reviewWidgetCode}
              className="min-h-[400px]"
            />
          ) : (
            <ReviewFallback className="space-y-4" />
          )}
        </CardContent>
      </Card>

      {/* Create Review Form */}
      {showCreateReview && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent>
            {!showCreateForm ? (
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="w-full"
              >
                Share Your Experience
              </Button>
            ) : (
              <form onSubmit={handleCreateReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={newReview.author}
                    onChange={(e) => setNewReview(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Rating
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                        className={`p-1 ${star <= newReview.rating ? 'text-amber-500' : 'text-gray-300'}`}
                      >
                        <Star className="h-6 w-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Review
                  </label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md h-24"
                    placeholder="Share your experience with this property..."
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createReviewMutation.isPending}
                    className="flex-1"
                  >
                    {createReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Reviews List */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviews.slice(0, maxReviews).map((review: any) => (
                <div key={review.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {review.author?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{review.author}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(review.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < review.rating ? 'text-amber-500 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedReviewWidget; 