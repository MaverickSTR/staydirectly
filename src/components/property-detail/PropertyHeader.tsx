import React from 'react';
import { MapPin, Heart, Share2 } from 'lucide-react';
import type { PropertyHeaderProps } from './types';

const PropertyHeader: React.FC<PropertyHeaderProps> = ({ 
  property, 
  isHeartFilled, 
  onHeartToggle 
}) => {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold mb-2">
        {property.title || property.name}
      </h1>
      
      <div className="flex flex-wrap items-center text-sm gap-y-2 justify-between">
        <div className="flex items-center mr-4 text-gray-600">
          <MapPin className="h-4 w-4 mr-1" />
          <span>
            {property.city || 'Unknown City'}
            {property.state && `, ${property.state}`}
            {property.country && `, ${property.country}`}
          </span>
        </div>
        
        {/* Empty space where duplicated Why Book Direct used to be */}
        <div className="flex-1"></div>
        
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
    </div>
  );
};

export default PropertyHeader; 