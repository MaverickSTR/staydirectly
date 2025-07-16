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
    <div id={`property-${id}`} className="property-card-container p-1 h-full">
      <Link href={getPropertyUrl(id, title || name)} className="block h-full">
        <Card 
          className="relative bg-white rounded-xl overflow-hidden hover-lift h-full fade-in border border-gray-700 flex flex-col"
          onMouseEnter={handleMouseEnter}
        >
          <div className="relative aspect-[3/2] overflow-hidden img-zoom-container flex-shrink-0">
            <img 
              src={imageUrl} 
              alt={title || name} 
              className="w-full h-full object-cover img-zoom"
            />
            <div className="absolute top-2 right-2">
              <HeartButton propertyId={id} className="" />
            </div>
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="bg-white/80 hover:bg-white/90 text-black font-medium shadow-sm hover-scale transition-all text-xs">
                {type}
              </Badge>
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between flex-grow">
            <div>
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-base line-clamp-1">{title || name}</h3>
                <div className="flex items-center">
                  <Star className="h-3 w-3 text-amber-500 fill-current" />
                  <span className="ml-1 text-xs font-medium">{rating?.toFixed(2)}</span>
                </div>
              </div>
              {showLocation && <p className="text-gray-600 text-xs mb-2">{location}</p>}
              <div className="flex justify-between items-center mb-2">
                <p>
                  <span className="font-bold text-sm">{formatPrice(price)}</span> 
                  <span className="text-gray-600 text-xs"> night</span>
                </p>
                {totalPrice && (
                  <p className="text-xs text-gray-500">{formatPrice(price * 6)} total</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-gray-600 text-xs border-t-2 border-gray-600 ">
              <div className="flex items-center gap-1">
                <Bed className="h-6 w-6" />
                <span className="text-lg font-bold">{bedrooms}</span>
              </div>
              <div className="w-px h-6 bg-gray-400"></div>
              <div className="flex items-center gap-1">
                <Bath className="h-6 w-6" />
                <span className="text-lg font-bold">{bathrooms}</span>
              </div>
              <div className="w-px h-6 bg-gray-400"></div>
              <div className="flex items-center gap-1">
                <Users className="h-6 w-6" />
                <span className="text-lg font-bold">{maxGuests}</span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
};

export default PropertyCard;
