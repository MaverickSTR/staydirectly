import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { PropertyCard } from "@/components/property";
import { MapView } from "@/components/map";
import { Button } from "@/components/ui/button";
import { Grid, Map } from "lucide-react";
import { useSearchProperties, useProperties } from '@/lib/api';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { FilterList, SearchPagination } from '@/components/search';
import { GoogleMapView } from '@/components/map';
import { Meta, SearchResultsStructuredData } from '@/lib/seo';
import { Property } from '@shared/schema';

function getLocationLabel(properties: Property[]): string {
  if (!properties || properties.length === 0) return "";

  const cities = new Set(properties.map(p => p.city).filter(Boolean));
  const states = new Set(properties.map(p => p.state).filter(Boolean));
  const countries = new Set(properties.map(p => p.country).filter(Boolean));

  if (cities.size === 1) {
    const city = Array.from(cities)[0];
    const state = Array.from(states)[0] || '';
    const country = Array.from(countries)[0] || '';
    return [city, state, country].filter(Boolean).join(", ");
  } else if (states.size === 1) {
    const state = Array.from(states)[0];
    const country = Array.from(countries)[0] || '';
    return [state, country].filter(Boolean).join(", ");
  } else if (countries.size === 1) {
    return Array.from(countries)[0];
  } else {
    return "Selected Area";
  }
}


  const SearchResults: React.FC = () => {
    const [location] = useLocation();
    
    const [currentPage, setCurrentPage] = useState(1);
    
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('map');
    const [selectedProperty, setSelectedProperty] = useState<number | string | null>(null);

    const [query, setQuery] = useState<string>('');
    const [filters, setFilters] = useState<any>({});


    useEffect(() => {
      const searchParams = new URLSearchParams(window.location.search);
      console.log("SearchResults - Full search params:");
      for (const [key, value] of searchParams.entries()) {
        console.log(`SearchResults - ${key}: ${value}`);
      }

      const q = searchParams.get('q') || '';
      console.log('SearchResults - Setting query:', q);
      setQuery(q);

      const newFilters: any = {};
      for (const [key, value] of searchParams.entries()) {
        switch (key) {
          case 'minPrice':
          case 'maxPrice':
          case 'bedrooms':
          case 'bathrooms':
          case 'guests':
            newFilters[key] = parseInt(value);
            break;
          case 'amenities':
            newFilters[key] = value.split(',');
            break;
          default:
            if (key !== 'q') newFilters[key] = value;
        }
      }

      console.log('SearchResults - Setting filters:', newFilters);
      setFilters(newFilters);
    }, [location]);




  const pageSize = 12;

  // Determine if we have any search criteria (query or meaningful filters)
  const hasSearchCriteria = query.trim() || Object.keys(filters).length > 0;
  
  // Use appropriate hook based on whether we have search criteria
  const searchResult = useSearchProperties(query, filters);
  const allPropertiesResult = useProperties();
  
  // Select the appropriate result based on search criteria
  const { data: properties, isLoading, isError } = hasSearchCriteria 
    ? searchResult 
    : allPropertiesResult;

  // Calculate pagination values
  const totalItems = properties?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentItems = properties?.slice(startIndex, endIndex) || [];

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle filter change
  const handleFilterChange = (newFilters: any) => {
    
    
    // If newFilters is empty (clearing filters), replace instead of merge
    const isClearing = Object.keys(newFilters).length === 0;
    const updatedFilters = isClearing ? {} : { ...filters, ...newFilters };
    
    setFilters(updatedFilters);
    setCurrentPage(1);
    
    // If clearing filters, also clear the search query to go to "All Properties"
    if (isClearing && query.trim()) {
      console.log('SearchResults - Clearing query to go to All Properties');
      setQuery('');
    }
  };

  // Build breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: hasSearchCriteria ? (query ? `Search results for "${query}"` : 'Filtered properties') : 'All properties' }
  ];

  return (
    <>
      <Meta 
        title={hasSearchCriteria ? (query ? `${query} - Search Results | StayDirectly` : 'Filtered Properties | StayDirectly') : 'All Properties | StayDirectly'}
        description={`Browse ${totalItems} properties ${hasSearchCriteria ? (query ? `matching "${query}"` : 'with your selected filters') : 'available for booking'} - book directly with hosts and save on fees.`}
        canonical={`/search${hasSearchCriteria ? (query ? `?q=${query}` : '') : ''}`}
      />
      
      {properties && properties.length > 0 && (
        <SearchResultsStructuredData 
          query={hasSearchCriteria ? (query || 'Filtered Properties') : 'All Properties'}
          resultCount={properties.length}
          properties={properties.map(property => ({
            name: property.name,
            url: `/property/${property.id}`,
            image: property.imageUrl,
            price: property.price,
            description: property.description.substring(0, 160),
            location: property.location
          }))}
        />
      )}

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <Breadcrumb items={breadcrumbItems} />

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {hasSearchCriteria ? (query ? `Properties matching "${query}"` : 'Filtered Properties') : 'All Properties'}
          </h1>
          
          {/* View toggle */}
          <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-1">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('grid')}
              className="w-10 h-10 p-0"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'map' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('map')}
              className="w-10 h-10 p-0"
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <FilterList onFilterChange={handleFilterChange} currentFilters={filters} />
        </div>
        
        {/* Results Count */}
        <p className="text-gray-600 mb-4">
          {isLoading ? 'Searching...' : 
           isError ? 'Error loading results' :
           `Showing ${startIndex + 1}-${endIndex} of ${totalItems} properties`}
        </p>
        
        {/* Map and results container - responsive layout for all screen sizes */}
        <div className={`flex flex-col ${viewMode === 'map' ? 'lg:flex-row' : ''} gap-6 mb-12`}>
          {/* Properties grid - either full width or left side depending on view mode */}
          <div className={`order-2 lg:order-1 ${viewMode === 'map' ? 'lg:w-3/5' : 'w-full'}`}>
            {isLoading ? (
              // Skeleton loading state for grid
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg overflow-hidden shadow-sm h-auto">
                    <div className="aspect-[4/3] bg-gray-200 animate-pulse"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse mb-2 w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse mb-3 w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-red-500 font-medium mb-2">Error loading properties</p>
                <p className="text-gray-600">Please try again later</p>
              </div>
            ) : properties?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-800 font-medium mb-2">No properties found</p>
                <p className="text-gray-600">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {currentItems.map((property) => (
                  <PropertyCard 
                    key={property.id} 
                    property={property} 
                    totalPrice 
                  />
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {!isLoading && !isError && properties && properties.length > 0 && (
              <div className="mt-8">
                <SearchPagination 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  onPageChange={handlePageChange} 
                />
              </div>
            )}
          </div>
          
          {/* Map view - either hidden, full width on mobile or right side on desktop */}
          {viewMode === 'map' && (
            <div className="order-1 lg:order-2 lg:w-2/5 h-[400px] lg:h-[calc(100vh-240px)] lg:min-h-[600px] lg:sticky lg:top-6 bg-gray-100 rounded-lg shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading map...</p>
                  </div>
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <p className="text-red-500">Error loading map</p>
                </div>
              ) : properties && properties.length > 0 ? (
                <GoogleMapView 
                  properties={properties}
                  height="100%"
                  center={
                    properties.length > 0
                      ? [
                          properties.reduce((sum, p) => sum + (p.latitude || 0), 0) / properties.length,
                          properties.reduce((sum, p) => sum + (p.longitude || 0), 0) / properties.length
                        ]
                      : [25.7617, -80.1918] // fallback to Miami
                  }
                  zoom={12}
                  onMarkerClick={(property) => {
                    // Set the selected property
                    setSelectedProperty(property.id);
                    
                    // Find the element and scroll to it
                    const element = document.getElementById(`property-${property.id}`);
                    if (element) {
                      // First remove highlight class from any previously highlighted properties
                      document.querySelectorAll('.property-highlight').forEach(el => {
                        el.classList.remove('property-highlight');
                      });
                      
                      // Add highlight class to the selected property card
                      const card = element.querySelector('.card-hover');
                      if (card) {
                        card.classList.add('property-highlight');
                      }
                      
                      // Scroll to the element
                      element.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center'
                      });
                    }
                    
                    // Auto-clear the highlight after 3 seconds
                    setTimeout(() => {
                      document.querySelectorAll('.property-highlight').forEach(el => {
                        el.classList.remove('property-highlight');
                      });
                      setSelectedProperty(null);
                    }, 3000);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <p className="text-gray-500">No properties to display on map</p>
                </div>
              )}
              
              {/* Info overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-sm z-[1000]">
                <h3 className="font-medium text-sm md:text-base mb-1">
                  {query || getLocationLabel(properties ?? [])}
                </h3>

                <p className="text-xs md:text-sm text-gray-600">
                  Showing {totalItems} {totalItems === 1 ? 'property' : 'properties'} in this area
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SearchResults;
