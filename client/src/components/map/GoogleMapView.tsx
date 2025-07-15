import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";

// Extend window type for Google Maps
declare global {
  interface Window {
    google?: {
      maps?: any;
      places?: any;
    };
  }
}

interface Property {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  title?: string;
  location?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  rating?: number;
  reviewCount?: number;
  [key: string]: any;
}

interface GoogleMapViewProps {
  properties: Property[] | Property;
  center?: [number, number];
  zoom?: number;
  height?: string;
  onMarkerClick?: (property: Property) => void;
}

// Helper function to safely parse coordinates
function safeParseCoordinate(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

// Helper function to validate coordinate values
function isValidCoordinate(lat: number | null, lng: number | null): lat is number {
  return (
    lat !== null && 
    lng !== null && 
    lat >= -90 && 
    lat <= 90 && 
    lng >= -180 && 
    lng <= 180
  );
}

// Markers component that only renders when map is ready
function MapMarkers({ 
  properties, 
  onMarkerClick, 
  isSinglePropertyView 
}: { 
  properties: Property[], 
  onMarkerClick?: (property: Property) => void,
  isSinglePropertyView: boolean 
}) {
  const map = useMap();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Wait for map to be fully loaded
  useEffect(() => {
    if (!map) return;

    let mounted = true;

    const checkMapReady = () => {
      try {
        // Check if map has a valid div and is properly initialized
        const mapDiv = map.getDiv();
        if (mapDiv && window.google?.maps && mounted) {
          setIsMapReady(true);
        }
      } catch (error) {
        console.warn('Map ready check failed:', error);
        if (mounted) {
          // Retry after a short delay
          setTimeout(checkMapReady, 100);
        }
      }
    };

    // Use a longer initial delay to ensure map is fully rendered
    const initialTimer = setTimeout(checkMapReady, 500);

    // Also listen for map events that indicate it's ready
    const idleListener = map.addListener('idle', () => {
      if (mounted) {
        setTimeout(checkMapReady, 100);
      }
    });

    const tilesLoadedListener = map.addListener('tilesloaded', () => {
      if (mounted) {
        setTimeout(checkMapReady, 100);
      }
    });
      
    return () => {
      mounted = false;
      clearTimeout(initialTimer);
      if (idleListener) {
        window.google?.maps?.event?.removeListener(idleListener);
      }
      if (tilesLoadedListener) {
        window.google?.maps?.event?.removeListener(tilesLoadedListener);
      }
    };
  }, [map]);

  const handleMarkerClick = useCallback((property: Property) => {
    setSelectedPropertyId(property.id);
    onMarkerClick?.(property);
  }, [onMarkerClick]);

  // Only render markers when map is ready
  if (!isMapReady || !map) {
    return null;
  }

  return (
    <>
      {properties.map((property) => {
        const lat = safeParseCoordinate(property.latitude);
        const lng = safeParseCoordinate(property.longitude);
        
        if (!isValidCoordinate(lat, lng)) {
          console.warn(`Invalid coordinates for property ${property.id}: lat=${lat}, lng=${lng}`);
          return null;
        }
        
        const position = { lat: lat!, lng: lng! };
        const isSelected = selectedPropertyId === property.id;

        try {
          return (
            <div key={property.id}>
              <AdvancedMarker
                position={position}
                onClick={() => handleMarkerClick(property)}
              >
                <div className={`relative ${isSinglePropertyView ? 'animate-bounce' : ''}`}>
                  {/* Custom marker design */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg transition-all duration-200 ${
                    isSelected 
                      ? 'bg-red-600 scale-110 ring-4 ring-red-200' 
                      : 'bg-primary hover:bg-primary-dark hover:scale-105'
                  }`}>
                    ${property.price ? Math.round(property.price) : '?'}
                  </div>
                  {/* Pointer */}
                  <div className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                    isSelected ? 'border-t-red-600' : 'border-t-primary'
                  }`}></div>
                </div>
              </AdvancedMarker>

              {isSelected && (
                <InfoWindow
                  position={position}
                  onCloseClick={() => setSelectedPropertyId(null)}
                >
                  <div className="p-2 min-w-[200px]">
                    <div className="font-semibold text-gray-900 mb-1">
                      {property.title || property.name}
                    </div>
                    {property.location && (
                      <div className="text-sm text-gray-600 mb-2">
                        {property.location}
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold text-primary">
                        ${property.price}/night
                      </span>
                      {property.rating && (
                        <div className="flex items-center text-yellow-500">
                          <span className="text-sm">⭐ {property.rating}</span>
                          {property.reviewCount && property.reviewCount > 0 && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({property.reviewCount})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 flex gap-3">
                      {property.bedrooms && <span>🛏️ {property.bedrooms} bed</span>}
                      {property.bathrooms && <span>🚿 {property.bathrooms} bath</span>}
                      {property.maxGuests && <span>👥 {property.maxGuests} guests</span>}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </div>
          );
        } catch (error) {
          console.error(`Error rendering marker for property ${property.id}:`, error);
          return null;
        }
      })}
    </>
  );
}

export default function GoogleMapView({
  properties,
  center,
  zoom = 12,
  height = "100%",
  onMarkerClick,
}: GoogleMapViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Check if Google Maps API is available
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined') {
        if (window.google?.maps) {
          setIsLoading(false);
          setHasError(false);
        } else {
          // Wait a bit more for the API to load
          setTimeout(checkGoogleMaps, 100);
        }
      }
    };

    checkGoogleMaps();
  }, []);

  if (typeof window !== 'undefined' && (!window.google || !window.google.maps)) {
    if (isLoading) {
      return (
        <div style={{ width: "100%", height }} className="flex items-center justify-center bg-gray-100 border border-gray-200 rounded-lg">
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Loading map...</p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ width: "100%", height }} className="flex items-center justify-center bg-gray-100 border border-gray-200 rounded-lg">
        <div className="text-center p-8 max-w-md">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm mb-2">Map not available</p>
          <p className="text-gray-400 text-xs mb-3">Google Maps API key not configured</p>
          <p className="text-gray-400 text-xs">Set VITE_GOOGLE_MAPS_API_KEY in your .env file</p>
        </div>
      </div>
    );
  }

  const isArray = Array.isArray(properties);
  const normalizedProperties = isArray ? properties : [properties];
  const isSinglePropertyView = !isArray;

  // Filter out properties with invalid coordinates
  const validProperties = normalizedProperties.filter(property => {
    const lat = safeParseCoordinate(property.latitude);
    const lng = safeParseCoordinate(property.longitude);
    return isValidCoordinate(lat, lng);
  });

  // Determine map center based on prop or property location
  const mapCenter = useMemo(() => {
    if (center) return { lat: center[0], lng: center[1] };
    
    if (validProperties.length === 0) {
      // Fallback to a default location if no valid properties
      return { lat: 25.7617, lng: -80.1918 }; // Miami
    }
    
    const firstProperty = validProperties[0];
    const lat = safeParseCoordinate(firstProperty.latitude);
    const lng = safeParseCoordinate(firstProperty.longitude);
    
    return { lat: lat!, lng: lng! };
  }, [center, validProperties]);

  // Show a message if no properties have valid coordinates
  if (validProperties.length === 0) {
    return (
      <div style={{ width: "100%", height }} className="flex items-center justify-center bg-gray-100 text-gray-500">
        <p>No properties with valid coordinates to display on map</p>
      </div>
    );
  }

  try {
    return (
      <div style={{ width: "100%", height }}>
        <Map
          defaultCenter={mapCenter}
          defaultZoom={zoom}
          mapId="DEMO_MAP_ID"
          gestureHandling="cooperative"
          disableDefaultUI={false}
          fullscreenControl={false}
          streetViewControl={false}
          mapTypeControl={true}
          onIdle={() => setIsLoading(false)}
        >
          <MapMarkers 
            properties={validProperties}
            onMarkerClick={onMarkerClick}
            isSinglePropertyView={isSinglePropertyView}
          />
        </Map>
      </div>
    );
  } catch (error) {
    console.error('Google Maps rendering error:', error);
    return (
      <div style={{ width: "100%", height }} className="flex items-center justify-center bg-gray-100 border border-gray-200 rounded-lg">
        <div className="text-center p-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm mb-2">Map loading error</p>
          <p className="text-gray-400 text-xs">Please refresh the page</p>
        </div>
      </div>
    );
  }
}
