import React from 'react';
import { UserCircle2, DoorOpen, Bed, Bath, Star } from 'lucide-react';
import { AirbnbImageOptimizer } from '@/components/property';
import type { PropertyBasicInfoProps } from './types';
import { formatDistanceToNow } from 'date-fns';

const PropertyBasicInfo: React.FC<PropertyBasicInfoProps> = ({ property, capacityData }) => {
  return (
    <div className="mb-6">
      <div className="text-gray-600 w-fit mb-4 flex items-center  justify-between rounded-xl border-2 border-gray-200 ">
        <span className="flex flex-col px-10 w-full border-r-2 border-gray-200 py-4">
          <p className='font-semibold text-gray-500'>Guests</p>
          <span className='flex items-center gap-2 font-semibold text-gray-800'><UserCircle2 size={24} className="" />
            {capacityData.max} </span>
        </span>
        <span className="flex flex-col px-10 w-full border-r-2 border-gray-200 py-4">
          <p className='font-semibold text-gray-500'>{capacityData.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</p>
          <span className='flex items-center gap-2 font-semibold text-gray-800'><DoorOpen size={24} className="" />
            {capacityData.bedrooms} </span>
        </span>
        <span className="flex flex-col px-10 w-full border-r-2 border-gray-200 py-4">
          <p className='font-semibold text-gray-500'>{capacityData.beds === 1 ? 'Bed' : 'Beds'}</p>
          <span className='flex items-center gap-2 font-semibold text-gray-800'><Bed size={24} className="" />
            {capacityData.beds} </span>
        </span>
        <span className="flex flex-col px-10 w-full py-4">
          <p className='font-semibold text-gray-500'>{capacityData.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</p>
          <span className='flex items-center gap-2 font-semibold text-gray-800'><Bath size={24} className="" />
            {typeof capacityData.bathrooms === 'number' && capacityData.bathrooms % 1 !== 0
              ? capacityData.bathrooms.toFixed(1)
              : capacityData.bathrooms} </span>
        </span>
      </div>
      

      {/* "Why Book Direct" items in horizontal layout + Rating */}
      <div className="flex flex-col flex-wrap mb-6 gap-3">
        {/* Item 1 - 5-Star Experience */}
        <div className="inline-flex w-fit items-center bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm hover-scale transition-all">
          <div className="bg-amber-50 p-1.5 rounded-full mr-2">
            <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 6L14.25 10.5L19.5 11.25L15.75 14.75L16.75 20L12 17.5L7.25 20L8.25 14.75L4.5 11.25L9.75 10.5L12 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" />
            </svg>
          </div>
          <span className="text-gray-900 text-sm font-medium">5-Star Experience</span>
        </div>

        {/* Item 2 - Book Direct and Save */}
        <div className="inline-flex items-center w-fit bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm hover-scale transition-all">
          <div className="bg-green-50 p-1.5 rounded-full mr-2">
            <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-gray-900 text-sm font-medium">Book Direct & Save</span>
        </div>

        {/* Item 3 - Self Check-in */}
        <div className="inline-flex items-center w-fit bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm hover-scale transition-all">
          <div className="bg-purple-50 p-1.5 rounded-full mr-2">
            <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-gray-900 text-sm font-medium">Self Check-in</span>
        </div>

      </div>

      <div className="flex items-start border-t border-gray-200 pt-4">
        <div className="w-12 h-12 overflow-hidden rounded-full mr-4 flex-shrink-0">
          <AirbnbImageOptimizer
            imageUrl={property.hostImage || 'https://randomuser.me/api/portraits/men/32.jpg'}
            alt={property.hostName || 'Host'}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-medium">Hosted by {property.hostName || 'Host'}</h3>
          <p className="text-gray-600 text-sm">
            {property.createdAt ? `Listed ${formatDistanceToNow(new Date(property.createdAt), { addSuffix: true })}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PropertyBasicInfo; 