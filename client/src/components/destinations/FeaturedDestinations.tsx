import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { DestinationCard } from '@/components/destinations';
import { useFeaturedCities } from '@/lib/api';

const FeaturedDestinations: React.FC = () => {
  const { data: featuredCities, isLoading: isLoadingCities, error: citiesError } = useFeaturedCities();

  return (
    <div className="container  px-4 py-12  mx-auto md:w-[90%]">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-display text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter">Featured Destinations</h2>
        <Link href="/destinations" className="py-2 px-4 border border-black text-black rounded-lg hover:scale-105 font-semibold tracking-tight flex items-center transition-all duration-200 w-[150px] text-center">
          View all <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoadingCities ? (
          // Skeleton loading state
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg overflow-hidden shadow-sm h-[250px]">
              <div className="aspect-[4/3] bg-gray-200 animate-pulse"></div>
              <div className="p-4">
                <div className="h-5 bg-gray-200 rounded animate-pulse mb-2 w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </div>
            </div>
          ))
        ) : citiesError ? (
          <div className="col-span-full text-center text-gray-500">
            Error loading featured destinations. Please try again later.
          </div>
        ) : Array.isArray(featuredCities) && featuredCities.length > 0 ? (
          featuredCities.map((city) => (
            <DestinationCard key={city.id} destination={city} />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            No featured destinations available.
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedDestinations; 