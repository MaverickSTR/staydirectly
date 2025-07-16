// src/components/NearbyPlaces.tsx
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCacheConfig } from "@/lib/queryClient";
import { MapPin } from "lucide-react";

// Haversine formula to compute distance in miles
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3; // Earth radius in meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = R * c;
  const miles = meters / 1609.344;
  
  return parseFloat(miles.toFixed(2));
}

// Extend window type for Google Maps
declare global {
  interface Window {
    google?: {
      maps?: any;
      places?: any;
    };
  }
}

// Define Type for nearby place
interface Place {
  id: string;
  displayName: { text: string };
  formattedAddress?: string;
  location: { latitude: number; longitude: number };
}

interface NearbyPlacesProps {
  latitude: number;
  longitude: number;
  radius?: number;
  types?: string[];
}

export default function NearbyPlaces({
  latitude,
  longitude,
  radius = 2000,
  types = ["restaurant", "supermarket", "park"],
}: NearbyPlacesProps) {
  // Use React Query for cached nearby places data
  const { 
    data: places = [], 
    error, 
    isLoading: loading 
  } = useQuery({
    queryKey: ['nearbyPlaces', latitude, longitude, radius, types],
    queryFn: async (): Promise<Place[]> => {
      if (!latitude || !longitude) return [];
      
      const res = await fetch(`/api/nearby?lat=${latitude}&lng=${longitude}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    enabled: !!(latitude && longitude), // Only run if coordinates are available
    ...getCacheConfig.static, // Use static caching since nearby places don't change often
    staleTime: 1000 * 60 * 60, // 1 hour - places data is relatively static
    gcTime: 1000 * 60 * 60 * 6, // 6 hours - keep in cache for a long time
  });

  const fetchFromServer = async () => {
    // This function is kept for the Google Maps fallback logic below
    try {
      const res = await fetch(`/api/nearby?lat=${latitude}&lng=${longitude}`);
      if (!res.ok) throw new Error("fetch failed");
      return await res.json();
    } catch {
      throw new Error("Unable to fetch nearby places");
    }
  };



  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-4">Nearby Places</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-4">Nearby Places</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">{error?.message || 'Unable to fetch nearby places'}</p>
        </div>
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-4">Nearby Places</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No nearby places found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-xl font-bold mb-4">Nearby Places</h3>
      <div className="space-y-3">
        {places.map((place) => (
          <div key={place.id} className="flex items-start space-x-3">
            <div className="w-4 h-4 mt-1 bg-black rounded-full flex-shrink-0"></div>
            <div>
              <p className="font-medium text-gray-900">{place.displayName.text}</p>
              <p className="text-sm text-gray-600">{place.formattedAddress}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
