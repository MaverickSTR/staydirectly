import React from 'react';
import { useRoute, Link } from 'wouter';
import { useProperty } from '@/lib/api';
import { Meta } from '@/lib/seo';
import { getIdFromSlug, getPropertyImgUrl, getPropertyUrl, slugify } from '@/lib/slugify';

const PropertyImagesPage: React.FC = () => {
  const [match, params] = useRoute('/property/images/:slug');
  const propertyId = match && params && params.slug ? getIdFromSlug(params.slug) : 0;
  const { data: property, isLoading } = useProperty(propertyId);

  if (!match || !params || !params.slug) {
    return <div className="container mx-auto p-8 text-center text-red-600">Route did not match or slug param missing. URL must be /property/images/:slug.<br/>params: {JSON.stringify(params)}</div>;
  }

  if (propertyId === 0) {
    return <div className="container mx-auto p-8 text-center text-red-600">Invalid property slug: {params.slug}.<br/>propertyId: {propertyId}</div>;
  }

  if (isLoading) {
    return <div className="container mx-auto p-8 text-center">Loading images...</div>;
  }

  if (!property) {
    return <div className="container mx-auto p-8 text-center">Property not found for id {propertyId} and slug {params.slug}.</div>;
  }

  // Collect all images (main + additional)
  const allImages = [property.imageUrl, ...(property.additionalImages || [])].filter(Boolean);

  return (
    <>
      <Meta
        title={`All Images - ${property.title || property.name}`}
        description={`All images for ${property.title || property.name}`}
        canonical={getPropertyImgUrl(property.id, property.name)}
      />
      <div className="container mx-auto px-4 pt-6">
        <Link href={getPropertyUrl(property.id, property.name)}>
          <button className="mb-4 px-4 py-2 ">&larr; Back to property</button>
        </Link>
        <h1 className="text-2xl font-bold mb-6">All Images for {property.title || property.name}</h1>
        <div className="flex flex-col gap-6 items-center">
          {allImages.length === 0 && (
            <div className="text-gray-500">No images available for this property.</div>
          )}
          {allImages.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`${property.title || property.name} image ${idx + 1}`}
              className="w-full max-w-3xl rounded-lg shadow-md object-cover"
              style={{ maxHeight: 600 }}
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default PropertyImagesPage; 