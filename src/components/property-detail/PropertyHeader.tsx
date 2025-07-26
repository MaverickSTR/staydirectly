import React from 'react';
import { MapPin, Heart, Share2, Star } from 'lucide-react';
import type { PropertyHeaderProps } from './types';

const PropertyHeader: React.FC<PropertyHeaderProps> = ({
  property,
  isHeartFilled,
  onHeartToggle
}) => {
  return (
    <div className="mb-6 flex w-full justify-between">
      <div className="flex flex-col text-sm gap-y-2">
        <h1 className="text-3xl font-bold mb-2">
          {property.title || property.name}
        </h1>
        <div className="flex items-center mr-4 text-gray-600">
          <MapPin className="h-4 w-4 mr-1" />
          <span>
            {property.city || 'Unknown City'}
            {property.state && `, ${property.state}`}
            {property.country && `, ${property.country}`}
          </span>

        </div>
        <div className="flex items-center ">
          <Star className="h-5 w-5 text-amber-500 fill-current" />
          <span className="font-bold text-lg mx-2">{property.rating?.toFixed(1)}</span>
          <span className="text-gray-600">({property.reviewCount || 0} {property.reviewCount === 1 ? 'review' : 'reviews'})</span>
        </div>

        {/* Empty space where duplicated Why Book Direct used to be */}
        <div className="flex-1"></div>


      </div>
      <div className="flex">
        <button
          onClick={onHeartToggle}
          className="flex items-center text-gray-600 hover:text-black transition-colors hover-scale"
        >
          <Heart
            className={`h-4 w-4 mr-1 ${isHeartFilled ? 'fill-current text-red-500 heart-beat active' : 'heart-beat'}`}
          />
          <span>Save</span>
        </button>

        <button className="flex items-center text-gray-600 hover:text-black transition-colors ml-4 hover-scale">
          <Share2 className="h-4 w-4 mr-2" />
          Share Property
        </button>
      </div>
    </div>
  );
};

export default PropertyHeader; 