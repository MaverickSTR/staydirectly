import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useProperty, usePropertyReviews } from '@/lib/api';
import { getIdFromSlug, slugify } from '@/lib/slugify';
import { RevyoosDirectEmbed } from '@/components/reviews';
import { PropertyGallery, AirbnbImageOptimizer, NearbyPlaces } from '@/components/property';
import { GoogleMapView } from '@/components/map';
import { Meta, PropertyStructuredData } from '@/lib/seo';
import Breadcrumb from '@/components/ui/Breadcrumb';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from '@/components/ui/card';

// Import our new components
import {
  PropertyLoadingSkeleton,
  PropertyNotFound,
  PropertyHeader,
  PropertyBasicInfo,
  getCapacityData,
  getAmenityDisplayName,
  AmenityIcon
} from '@/components/property-detail';
import { FAQ } from '@/components';

const PropertyDetail: React.FC = () => {
  const [match, params] = useRoute('/property/:slug');
  const propertyId = match ? getIdFromSlug(params.slug) : 0;

  const [isHeartFilled, setIsHeartFilled] = useState(false);
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);

  const { data: property, isLoading: isLoadingProperty } = useProperty(propertyId);
  const { data: reviews, isLoading: isLoadingReviews } = usePropertyReviews(propertyId);

  const toggleHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsHeartFilled(!isHeartFilled);
  };

  // Loading state
  if (isLoadingProperty) {
    return <PropertyLoadingSkeleton />;
  }

  // Error state
  if (!property) {
    return <PropertyNotFound />;
  }

  // Get capacity data
  const capacityData = getCapacityData(property);

  // Breadcrumb items
  const locationParts = property.location.split(',');
  const state = locationParts.length > 1 ? locationParts[1].trim() : '';

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    // { label: state, href: `/search?q=${state}` },
    { label: property.city, href: `/city/${property.city}` },
    { label: property.name }
  ];

  return (
    <>
      <Meta
        title={`${property.title || property.name} in ${property.city}${property.state ? `, ${property.state}` : ''} | StayDirectly`}
        description={property.description.substring(0, 160)}
        canonical={`/property/${property.id}-${slugify(property.title || property.name)}`}
        image={property.imageUrl}
        type="product"
      />

      <PropertyStructuredData
        name={property.title || property.name}
        description={property.description.substring(0, 160)}
        image={property.imageUrl}
        price={property.price}
        ratingValue={property.rating || 0}
        reviewCount={property.reviewCount || 0}
        address={property.location}
      />

      <div className="container mx-auto px-4 pt-6">
        {/* Breadcrumbs */}
        <nav>
          <Breadcrumb items={breadcrumbItems} />
        </nav>

        {/* Property Header */}
        <PropertyHeader
          property={property}
          isHeartFilled={isHeartFilled}
          onHeartToggle={toggleHeart}
        />

        {/* Property Gallery */}
        <div className="mb-8">
          <PropertyGallery
            propertyName={property.name}
            propertyId={property.id}
            platformId={property.platformId || property.hospitablePlatformId}
            imageUrl={property.imageUrl}
            additionalImages={property.additionalImages || []}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column for property details */}
          <div className="lg:col-span-2">
            {/* Property Basic Info */}
            <PropertyBasicInfo
              property={property}
              capacityData={capacityData}
            />

            {/* Property Description */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <div className="prose max-w-none text-gray-600">
                <p>
                  {property.description && property.description.length > 500
                    ? `${property.description.substring(0, 500)}...`
                    : property.description}
                </p>
              </div>

              {property.description && property.description.length > 500 && (
                <Accordion type="single" collapsible className="w-full mt-4 border-t pt-4">
                  <AccordionItem value="description" className="border-none">
                    <AccordionTrigger className="py-2 font-medium text-black">
                      Read full description
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      <div className="space-y-4">
                        {property.description.substring(500).split(/\n{2,}/).map((paragraph: string, index: number) => {
                          if (!paragraph.trim()) return null;
                          return (
                            <p key={index}>
                              {paragraph.split('\n').map((line: string, lineIndex: number) => (
                                <React.Fragment key={lineIndex}>
                                  {lineIndex > 0 && <br />}
                                  {line}
                                </React.Fragment>
                              ))}
                            </p>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>

            {/* Amenities */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <h2 className="text-xl font-bold mb-6">What this place offers</h2>

              {/* Top 6 Amenities Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 mb-6">
                {(property.featuredAmenities?.length > 0
                  ? property.featuredAmenities.slice(0, 6)
                  : property.amenities?.slice(0, 6) || []
                ).map((amenity: string, index: number) => (
                  <div key={index} className="flex items-center">
                    <AmenityIcon amenity={amenity} />
                    <span className="ml-3">{getAmenityDisplayName(amenity)}</span>
                  </div>
                ))}
              </div>

              {/* Expanded Amenities Section */}
              {amenitiesExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 mb-6 border-t pt-6">
                  {property.amenities?.filter((amenity: string) =>
                    !(property.featuredAmenities?.slice(0, 6).includes(amenity))
                  ).map((amenity: string, index: number) => (
                    <div key={index} className="flex items-center">
                      <AmenityIcon amenity={amenity} />
                      <span className="ml-3">{getAmenityDisplayName(amenity)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Show/Hide All Amenities Button */}
              <button
                className="border border-gray-800 hover:bg-gray-100 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors hover-scale"
                onClick={() => setAmenitiesExpanded(!amenitiesExpanded)}
              >
                {amenitiesExpanded
                  ? "Hide amenities"
                  : `Show all ${property.amenities?.length || 0} amenities`}
              </button>
            </div>

            {/* Where you'll sleep */}
            {property.bedroomDetails && property.bedroomDetails.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h2 className="text-xl font-bold mb-6">Where you'll sleep</h2>

                {/* Grid layout for bedrooms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {property.bedroomDetails.slice(0, 2).map((bedroom: any, index: number) => (
                    <div key={index} className="h-full">
                      <div className="overflow-hidden h-full flex flex-col">
                        <div className="aspect-video relative overflow-hidden bg-gray-100 mb-4 rounded-lg">
                          <AirbnbImageOptimizer
                            imageUrl={bedroom.image || property.imageUrl}
                            alt={`${bedroom.name} in ${property.name}`}
                            className="w-full h-full hover-scale transition-transform duration-700"
                          />
                        </div>
                        <h3 className="font-medium text-base mb-1">{bedroom.name}</h3>
                        <div className="text-gray-600 text-sm">
                          {bedroom.beds.map((bed: any, bedIndex: number) => (
                            <span key={bedIndex}>
                              {bedIndex > 0 && ', '}
                              {bed.count} {bed.count > 1 ? bed.type + 's' : bed.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            {property.reviewWidgetCode && (
              <div className="bg-white p-6 rounded-lg shadow-sm mb-6 overflow-visible">
                <div className="border-b border-gray-200 pb-4 mb-6">
                  <h2 className="text-xl font-bold">Guest Reviews</h2>
                  {property.rating && (
                    <div className="flex items-center mt-2">
                      <span className="font-semibold mr-1">{property.rating.toFixed(1)}</span>
                      <span className="text-gray-600">({property.reviewCount} reviews)</span>
                    </div>
                  )}
                </div>

                <div className="relative w-full min-h-[600px]">
                  <RevyoosDirectEmbed
                    reviewWidgetCode={property.reviewWidgetCode}
                    className="w-full min-h-[600px]"
                  />
                </div>
              </div>
            )}

            {/* Location Map */}
            {property.latitude && property.longitude && (
              <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-xl font-bold mb-4">Location</h3>
                <div className="aspect-[16/9] rounded-lg mb-4 overflow-hidden">
                  <div className="w-full h-[400px] lg:h-[calc(100vh-240px)] lg:min-h-[600px] sticky top-6 bg-gray-100 rounded-lg shadow-sm overflow-hidden">
                    <GoogleMapView
                      properties={property}
                      height="100%"
                      center={[property.latitude, property.longitude]}
                      zoom={14}
                      onMarkerClick={(clickedProperty) => {
                        const gridElement = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3.gap-8');
                        if (gridElement) {
                          gridElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                          });
                        }
                      }}
                    />

                    {/* Info overlay */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-sm z-[1000]">
                      <h3 className="font-medium text-sm md:text-base mb-1">
                        {property.location}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="text-gray-600">
                  <p className="mb-2">
                    <strong>{property.location}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Nearby landmarks */}
            {property.latitude && property.longitude && (
              <NearbyPlaces latitude={property.latitude} longitude={property.longitude} />
            )}

            {/* FAQ Section */}
            {/* <FAQ faqs={property.faqs || []} /> */}
          </div>

          {/* Booking Column */}
          <div className="sticky top-24 h-fit">
            <iframe
              id="booking-iframe"
              sandbox="allow-top-navigation allow-scripts allow-same-origin allow-forms"
              className="w-full h-[800px] border-1 border-gray-200 rounded-lg shadow-sm"
              scrolling="no"
              src={property.bookingWidgetUrl || "https://booking.hospitable.com/widget/55ea1cea-3c99-40f7-b98b-3de392f74a36/1080590"}
            ></iframe>
          </div>
        </div>
      </div>
    </>
  );
}

export default PropertyDetail;
