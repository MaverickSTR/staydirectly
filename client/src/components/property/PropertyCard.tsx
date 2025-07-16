import React from 'react';
import { Link } from 'wouter';
import { Property } from '@shared/schema';
import { Star, Bed, Bath, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HeartButton from '@/components/ui/HeartButton';
import { formatPrice } from '@/lib/utils';
import { getPropertyUrl } from '@/lib/slugify';
import { usePrefetchCommonData } from '@/lib/api';
import '@/lib/animations.css';

interface PropertyCardProps {
  property: Property;
  showLocation?: boolean;
  totalPrice?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  showLocation = true,
  totalPrice = false,
}) => {
  const {
    id,
    name,
    title,
    location,
    price,
    rating,
    reviewCount,
    imageUrl,
    bedrooms,
    bathrooms,
    maxGuests,
    type
  } = property;

  const { prefetchPropertyDetails } = usePrefetchCommonData();

  // Prefetch property details on hover
  const handleMouseEnter = () => {
    prefetchPropertyDetails(id);
  };

  return (
    <div id={`property-${id}`} className="property-card-container p-1">
      <Link href={getPropertyUrl(id, title || name)}>
        <Card 
          className="relative bg-white rounded-xl overflow-hidden hover-lift h-full fade-in border border-gray-700"
          onMouseEnter={handleMouseEnter}
        >
          <div className="relative aspect-[4/3] overflow-hidden img-zoom-container">
            <img 
              src={imageUrl} 
              alt={title || name} 
              className="w-full h-full object-cover img-zoom"
            />
            <div className="absolute top-3 right-3">
              <HeartButton propertyId={id} className="" />
            </div>
            <div className="absolute bottom-3 left-3">
              <Badge variant="secondary" className="bg-white/80 hover:bg-white/90 text-black font-medium shadow-sm hover-scale transition-all">
                {type}
              </Badge>
            </div>
          </div>
          <div className="pt-4 px-4 h-full flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg line-clamp-1">{title || name}</h3>
              <div className="flex items-center">
                <Star className="h-4 w-4 text-amber-500 fill-current" />
                <span className="ml-1 text-sm font-medium">{rating?.toFixed(2)}</span>
              </div>
            </div>
            {showLocation && <p className="text-gray-600 text-sm mb-2">{location}</p>}
            <div className="flex justify-between items-center mb-3">
              <p>
                <span className="font-bold">{formatPrice(price)}</span> 
                <span className="text-gray-600"> night</span>
              </p>
              {totalPrice && (
                <p className="text-sm text-gray-500">{formatPrice(price * 6)} total</p>
              )}
            </div>
            <div className="flex items-center gap-4 text-gray-600 text-sm mt-3 pt-3 border-t border-gray-100 w-full">
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                <span>{bedrooms}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                <span>{bathrooms}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{maxGuests}</span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
};

export default PropertyCard;
