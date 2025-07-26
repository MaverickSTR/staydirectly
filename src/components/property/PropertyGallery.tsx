import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, X, Grid, Loader2, ZoomIn, ZoomOut, ImagePlus } from 'lucide-react';
import { usePropertyImages } from '@/hooks/use-property-images';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useLocation } from 'wouter';
import { slugify, getPropertyImgUrl } from '@/lib/slugify';
import styles from './PropertyGallery.module.css';

interface PropertyGalleryProps {
  images?: string[];
  propertyName: string;
  platformId?: string | null;
  defaultCustomerId?: string;
  imageUrl?: string;        // For when we have a stored main image
  additionalImages?: string[]; // For when we have stored additional images
  propertyId?: number;
}

const PropertyGallery: React.FC<PropertyGalleryProps> = ({
  images: providedImages,
  propertyName,
  platformId,
  defaultCustomerId,
  imageUrl,
  additionalImages,
  propertyId,
}) => {
  // Start with an initial image to prevent infinite loops
  const initialImage = imageUrl || (providedImages && providedImages.length > 0 ? providedImages[0] : null);
  const [displayImages, setDisplayImages] = useState<string[]>(initialImage ? [initialImage] : []);
  const [fullScreen, setFullScreen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [location, setLocation] = useLocation();

  // Debounced mobile check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    let timeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(checkMobile, 100);
    };
    checkMobile();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  // Memoize stored database images
  const storedDbImages = useMemo(() => {
    if (imageUrl || (additionalImages && additionalImages.length > 0)) {
      return {
        mainImage: imageUrl,
        additionalImages: additionalImages || []
      };
    }
    return undefined;
  }, [imageUrl, additionalImages]);

  // Fetch images from Hospitable API if we have platformId
  const {
    data: propertyImages,
    isLoading: loadingImages,
    isError: imagesError
  } = usePropertyImages(
    platformId || null,
    defaultCustomerId,
    storedDbImages
  );

  // Centralized image processing logic
  const processedImages = useMemo(() => {
    let newImages: string[] = [];
    if (propertyImages && propertyImages.length > 0) {
      // Sort and deduplicate
      const sortedImages = [...propertyImages].sort((a, b) => {
        const aPos = a.order !== undefined ? a.order : a.position;
        const bPos = b.order !== undefined ? b.order : b.position;
        return aPos - bPos;
      });
      const distinctUrls = new Set<string>();
      newImages = sortedImages
        .filter(img => img.url && img.url.trim() !== '')
        .filter(img => {
          if (distinctUrls.has(img.url)) return false;
          distinctUrls.add(img.url);
          return true;
        })
        .map((img, index) => {
          if (img.url && img.url.includes('muscache.com/im/')) {
            const processed = img.url.replace(/\?aki_policy=[^&]+/, `?aki_policy=large&pos=${index}`);
            if (!processed.includes('aki_policy=')) {
              return processed + (processed.includes('?') ? '&' : '?') + `aki_policy=large&pos=${index}`;
            }
            return processed;
          }
          return img.url;
        });
    } else if ((imageUrl || (additionalImages && additionalImages.length > 0))) {
      const urls: string[] = [];
      if (imageUrl) {
        let mainUrl = imageUrl;
        if (mainUrl.includes('muscache.com/im/')) {
          mainUrl = mainUrl.replace(/\?aki_policy=[^&]+/, '?aki_policy=large&pos=0');
          if (!mainUrl.includes('aki_policy=')) {
            mainUrl += (mainUrl.includes('?') ? '&' : '?') + 'aki_policy=large&pos=0';
          }
        }
        urls.push(mainUrl);
      }
      if (additionalImages && additionalImages.length > 0) {
        additionalImages.forEach((url, idx) => {
          if (!url) return;
          let processedUrl = url;
          if (processedUrl.includes('muscache.com/im/')) {
            processedUrl = processedUrl.replace(/\?aki_policy=[^&]+/, `?aki_policy=large&pos=${idx + 1}`);
            if (!processedUrl.includes('aki_policy=')) {
              processedUrl += (processedUrl.includes('?') ? '&' : '?') + `aki_policy=large&pos=${idx + 1}`;
            }
          }
          urls.push(processedUrl);
        });
      }
      if (urls.length > 0) newImages = urls;
    } else if (providedImages && providedImages.length > 0) {
      newImages = providedImages.map((url, index) => {
        if (url && url.includes('muscache.com/im/')) {
          const processed = url.replace(/\?aki_policy=[^&]+/, `?aki_policy=large&pos=${index}`);
          if (!processed.includes('aki_policy=')) {
            return processed + (processed.includes('?') ? '&' : '?') + `aki_policy=large&pos=${index}`;
          }
          return processed;
        }
        return url;
      });
    } else {
      newImages = ['/placeholder-property.jpg'];
    }
    return newImages;
  }, [propertyImages, providedImages, imageUrl, additionalImages, platformId]);

  // Only update displayImages if processedImages changed
  useEffect(() => {
    if (JSON.stringify(displayImages) !== JSON.stringify(processedImages)) {
      setDisplayImages(processedImages);
      setCurrentIndex(0); // Reset index if images change
    }
  }, [processedImages]);

  // Navigation handlers
  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % displayImages.length);
  }, [displayImages.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + displayImages.length) % displayImages.length);
  }, [displayImages.length]);

  const handleThumbnailClick = (index: number) => setCurrentIndex(index);

  // Touch and mouse drag handlers (cleaned up)
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [mouseStart, setMouseStart] = useState<number | null>(null);
  const [mouseEnd, setMouseEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && displayImages.length > 1) goToNext();
    if (distance < -minSwipeDistance && displayImages.length > 1) goToPrevious();
    setTouchStart(null);
    setTouchEnd(null);
  };
  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setMouseEnd(null);
    setMouseStart(e.clientX);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setMouseEnd(e.clientX);
  };
  const onMouseUp = () => {
    if (mouseStart === null || mouseEnd === null || !isDragging) return;
    const distance = mouseStart - mouseEnd;
    if (distance > minSwipeDistance && displayImages.length > 1) goToNext();
    if (distance < -minSwipeDistance && displayImages.length > 1) goToPrevious();
    setIsDragging(false);
    setMouseStart(null);
    setMouseEnd(null);
  };
  const onMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setMouseStart(null);
      setMouseEnd(null);
    }
  };

  // Optimized image URL function
  const getOptimizedImageUrl = useCallback((originalUrl: string, size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium') => {
    if (!originalUrl) return '/placeholder-property.jpg';
    if (originalUrl.includes('muscache.com/im/')) {
      const sizeParams = {
        small: 'aki_policy=small&pos=0',
        medium: 'aki_policy=medium&pos=0',
        large: 'aki_policy=large&pos=0',
        xlarge: 'aki_policy=xlarge&pos=0'
      };
      let optimizedUrl = originalUrl.replace(/\?aki_policy=[^&]+/, `?${sizeParams[size]}`);
      if (!optimizedUrl.includes('aki_policy=')) {
        optimizedUrl += (optimizedUrl.includes('?') ? '&' : '?') + sizeParams[size];
      }
      return optimizedUrl;
    }
    return originalUrl;
  }, []);

  const getImageUrl = useCallback((image: string, index: number) => {
    const size = isMobile ? 'small' : 'medium';
    return getOptimizedImageUrl(image, size);
  }, [isMobile, getOptimizedImageUrl]);

  // Centralized error handler
  const handleImageError = useCallback((index: number, fallbackUrl: string) => {
    setFailedImages(prev => ({ ...prev, [index]: true }));
    return fallbackUrl;
  }, []);

  // Helper to route to all-images page
  const goToAllImagesPage = useCallback(() => {
    if (!propertyId || !propertyName) return;
    setLocation(getPropertyImgUrl(propertyId, propertyName));
  }, [propertyId, propertyName, setLocation]);

  // If we're loading images from API, show a loading state
  if (platformId && loadingImages && displayImages.length <= 1) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[400px] md:h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="md:col-span-4 text-center flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-black mb-2" />
          <p className="text-gray-600">Loading property images...</p>
        </div>
      </div>
    );
  }

  // If there are no images available, show an empty state
  if (displayImages.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[400px] md:h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="md:col-span-4 text-center">
          <p className="text-gray-600">No images available for this property</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop gallery grid */}
      <div className="hidden md:grid grid-cols-4 gap-2 h-[400px] mb-8 relative bg-blue-50/30 p-4 rounded-xl">
        {/* Main large image (first column span 2 rows) */}
        <div
          className="col-span-2 row-span-2 relative rounded-xl overflow-hidden h-full"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        >
          <img
            src={getImageUrl(displayImages[0], 0)}
            alt={`${propertyName} - main view`}
            className="w-full h-full object-cover cursor-pointer gallery-image"
            loading="eager"
            onClick={goToAllImagesPage}
            onError={(e) => {
              e.currentTarget.src = handleImageError(0, '/placeholder-property.jpg');
            }}
          />
        </div>

        {Array.from({ length: 4 }).map((_, index) => {
          // Calculate actual image index (add 1 to skip main image)
          const imageIndex = index + 1;
          // Check if we have this image in our array
          const hasImage = displayImages.length > imageIndex;

          // Always use the first image instead of making API calls
          // This prevents hitting rate limits
          let imageUrl: string;

          if (hasImage) {
            // Use the image we have from our display images array
            imageUrl = displayImages[imageIndex];
          } else if (displayImages.length > 0) {
            // If we don't have enough images, duplicate the first one
            imageUrl = displayImages[0];
          } else {
            // If no images available, use placeholder
            imageUrl = '/placeholder-property.jpg';
          }

          return (
            <div
              key={`gallery-thumb-${index}`}
              className={`h-full rounded-xl `}
            >
              <img
                src={getImageUrl(imageUrl, imageIndex)}
                alt={`${propertyName} - view ${index + 2}`}
                className={`w-full h-full object-cover cursor-pointer rounded-xl `}
                loading="lazy"
                onClick={goToAllImagesPage}
                onError={(e) => {
                  console.log(`Thumbnail ${index} failed to load`);
                  if (displayImages[0] && displayImages[0] !== imageUrl) {
                    // If we have a main image, use that
                    console.log(`Using main image for thumbnail ${index}`);
                    e.currentTarget.src = displayImages[0];
                  } else {
                    // Fallback to placeholder
                    e.currentTarget.src = '/placeholder-property.jpg';
                  }
                }}
              />
              {index === 3 && displayImages.length > 5 && (
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToAllImagesPage();
                  }}
                  className="absolute right-4 bottom-4 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                  <Grid className="mr-2 h-4 w-4" /> Show all photos
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile-specific horizontal swipe carousel */}
      <div className="md:hidden relative mb-4">
        <div
          className={`relative h-[300px] w-full overflow-hidden rounded-lg swipe-area ${touchStart || touchEnd || isDragging ? 'swiping' : ''}`}
          style={{
            touchAction: 'none',
            WebkitOverflowScrolling: 'touch',
            cursor: isDragging ? 'grabbing' : 'grab',
            height: '300px', // Ensure fixed height for mobile carousel
            width: '100%',
            maxWidth: '100vw',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        >
          {/* Touch navigation overlay for mobile */}
          <div
            className="absolute inset-0 z-20"
            style={{ touchAction: 'none' }}
          />

          {/* Horizontal image carousel */}
          <div
            className="flex h-full carousel-container"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
              width: `${displayImages.length * 100}%`,
              height: '300px', // Ensure fixed height for carousel
              maxWidth: '100vw',
            }}
          >
            {displayImages.map((image, index) => (
              <div
                key={index}
                className="relative flex-shrink-0 w-full h-full"
                style={{ width: '100%', height: '300px', maxWidth: '100vw' }}
              >
                <img
                  src={getImageUrl(image, index)}
                  alt={`${propertyName} - view ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  style={{
                    pointerEvents: 'none',
                    imageRendering: 'auto',
                    backfaceVisibility: 'hidden',
                    perspective: '1000px',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    maxWidth: '100vw',
                  }}
                  loading={index === 0 ? "eager" : "lazy"}
                  onClick={goToAllImagesPage}
                  onLoad={() => {
                    console.log(`Mobile carousel image ${index} loaded successfully:`, image);
                  }}
                  onError={(e) => {
                    console.log(`Mobile carousel image ${index} failed to load:`, image);
                    if (displayImages[0] && displayImages[0] !== image) {
                      // Use the primary image if available
                      e.currentTarget.src = getImageUrl(displayImages[0], 0);
                    } else {
                      // Final fallback
                      e.currentTarget.src = '/placeholder-property.jpg';
                    }
                  }}
                />
              </div>
            ))}
          </div>

          {displayImages.length > 1 && (
            <>
              {/* Photo counter indicator */}
              <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm z-30">
                {currentIndex + 1} / {displayImages.length}
              </div>

              {/* Show all photos button */}
              <Button
                variant="ghost"
                onClick={goToAllImagesPage}
                className="absolute right-4 bottom-4 bg-white/90 hover:bg-white text-gray-800 px-3 py-1 rounded-full text-sm shadow-sm z-30"
              >
                <Grid className="h-3.5 w-3.5 mr-1" /> All photos
              </Button>

              {/* Image dots indicator */}
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
                {displayImages.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-screen gallery with zoom capabilities */}
      <Dialog open={fullScreen} onOpenChange={setFullScreen}>
        <DialogContent
          className="w-full h-full p-0 flex items-center justify-center"
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '100vw',
            height: '100vh',
            padding: 0,
          }}
        >
          <DialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center">
            <DialogTitle className="text-white drop-shadow-md">{propertyName}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullScreen(false)}
              className="text-white hover:bg-black/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </DialogHeader>

          <div
            className="relative h-full w-full flex flex-col items-center justify-center"
            style={{
              height: '100%',
              width: '100%',
              maxWidth: '90vw',
              maxHeight: '90vh',
            }}
          >
            {/* Main image area: mobile = horizontal scroll, desktop = zoom/pan */}
            {isMobile ? (
              <div
                className="flex-1 w-full h-full overflow-x-auto flex snap-x snap-mandatory"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: 'x mandatory',
                  height: '100vh',
                  width: '100vw',
                }}
              >
                {displayImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-full h-full flex items-center justify-center snap-center"
                    style={{ width: '100vw', height: '100vh', scrollSnapAlign: 'center' }}
                  >
                    <img
                      src={getOptimizedImageUrl(img, isMobile ? 'small' : 'large')}
                      alt={`${propertyName} - gallery view ${idx + 1}`}
                      className="object-contain"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      onError={(e) => {
                        if (displayImages[0] && displayImages[0] !== img) {
                          e.currentTarget.src = displayImages[0];
                        } else {
                          e.currentTarget.src = '/placeholder-property.jpg';
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // Desktop: keep zoom/pan
              <div
                className={`flex-1 relative flex items-center justify-center bg-black swipe-area ${touchStart || touchEnd || isDragging ? 'swiping' : ''}`}
                style={{
                  cursor: isDragging ? 'grabbing' : 'grab',
                  height: '100%',
                  width: '100%',
                  maxHeight: '90vh',
                  maxWidth: '90vw',
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
              >
                {/* Swipe direction indicators */}
                <div className="gallery-indicator left">
                  <ChevronLeft className="h-6 w-6 text-white" />
                </div>
                <div className="gallery-indicator right">
                  <ChevronRight className="h-6 w-6 text-white" />
                </div>
                <TransformWrapper
                  key={currentIndex}
                  initialScale={1}
                  minScale={0.5}
                  maxScale={3}
                  centerOnInit={true}
                  wheel={{ step: 0.05 }}
                  doubleClick={{ mode: "reset" }}
                  panning={{ disabled: false, velocityDisabled: true }}
                  limitToBounds={true}
                  smooth={true}
                >
                  {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                      <div className="absolute top-4 right-4 flex gap-2 z-40">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => zoomIn()}
                          className="bg-black/30 text-white hover:bg-black/50 rounded-full p-2"
                        >
                          <ZoomIn className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => zoomOut()}
                          className="bg-black/30 text-white hover:bg-black/50 rounded-full p-2"
                        >
                          <ZoomOut className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => resetTransform()}
                          className="bg-black/30 text-white hover:bg-black/50 rounded-full p-2"
                        >
                          <span className="text-xs font-medium">Reset</span>
                        </Button>
                      </div>
                      <TransformComponent
                        wrapperStyle={{
                          width: '100%',
                          height: '100%',
                          maxWidth: '90vw',
                          maxHeight: '90vh',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        contentStyle={{
                          width: '100%',
                          height: '100%',
                          maxWidth: '90vw',
                          maxHeight: '90vh',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={getOptimizedImageUrl(
                            displayImages[currentIndex] ||
                            (displayImages.length > 0 ? displayImages[0] : '/placeholder-property.jpg'),
                            'large'
                          )}
                          alt={`${propertyName} - gallery view ${currentIndex + 1}`}
                          className="object-contain"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            margin: 'auto',
                          }}
                          loading="eager"
                          onError={(e) => {
                            if (currentIndex > 0 && displayImages[0]) {
                              e.currentTarget.src = displayImages[0];
                            } else {
                              e.currentTarget.src = '/placeholder-property.jpg';
                            }
                          }}
                        />
                      </TransformComponent>
                    </>
                  )}
                </TransformWrapper>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50 rounded-full p-2 z-40"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 text-white hover:bg-black/50 rounded-full p-2 z-40"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                <div className="md:hidden absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm z-40">
                  {currentIndex + 1} / {displayImages.length}
                </div>
              </div>
            )}

            {/* Thumbnails */}
            <div className="h-20 bg-black py-2 px-4 flex gap-2 overflow-x-auto">
              {displayImages.map((img, idx) => (
                <div
                  key={idx}
                  className={`h-16 w-24 flex-shrink-0 cursor-pointer border-2 ${idx === currentIndex ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  onClick={() => handleThumbnailClick(idx)}
                >
                  <img
                    src={getImageUrl(img, idx)}
                    alt={`${propertyName} thumbnail ${idx + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // For thumbnails, just use the primary image if available, otherwise placeholder
                      if (idx > 0 && displayImages[0]) {
                        e.currentTarget.src = displayImages[0];
                      } else {
                        e.currentTarget.src = '/placeholder-property.jpg';
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PropertyGallery;