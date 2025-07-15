import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { PropertyCard } from '@/components/property';
import { useFeaturedProperties } from '@/lib/api';

const FeaturedProperties: React.FC = () => {
  const { data: featuredProperties, isLoading: isLoadingProperties, error: propertiesError } = useFeaturedProperties();

  return (
    <div className="container px-4 py-12 w-[90%] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Featured Properties</h2>
        <Link href="/search" className="py-2 px-4 border border-black text-black rounded-lg hover:scale-105 font-medium flex items-center">
          View all <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoadingProperties ? (
          // Skeleton loading state
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg overflow-hidden shadow-sm h-[300px]">
              <div className="aspect-[4/3] bg-gray-200 animate-pulse"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse mb-2 w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse mb-3 w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
              </div>
            </div>
          ))
        ) : propertiesError ? (
          <div className="col-span-full text-center text-gray-500">
            Error loading featured properties. Please try again later.
          </div>
        ) : Array.isArray(featuredProperties) && featuredProperties.length > 0 ? (
          featuredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            No featured properties available.
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedProperties; 