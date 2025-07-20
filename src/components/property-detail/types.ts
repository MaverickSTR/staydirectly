export interface Property {
  id: number;
  name: string;
  title?: string;
  description: string;
  price: number;
  location: string;
  city: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  additionalImages?: string[];
  rating?: number;
  reviewCount?: number;
  hostName?: string;
  hostImage?: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  capacity?: {
    max?: number;
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
  };
  amenities?: string[];
  featuredAmenities?: string[];
  bedroomDetails?: BedroomDetail[];
  bookingWidgetUrl?: string;
  reviewWidgetCode?: string;
  platformId?: string;
  hospitablePlatformId?: string;
}

export interface BedroomDetail {
  id: number;
  name: string;
  beds: Bed[];
  image: string;
}

export interface Bed {
  type: string;
  count: number;
}

export interface CapacityData {
  max: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PropertyHeaderProps {
  property: Property;
  isHeartFilled: boolean;
  onHeartToggle: (e: React.MouseEvent) => void;
}

export interface PropertyBasicInfoProps {
  property: Property;
  capacityData: CapacityData;
}

export interface PropertyDescriptionProps {
  description: string;
}

export interface PropertyAmenitiesProps {
  amenities: string[];
  featuredAmenities?: string[];
}

export interface PropertyBedroomsProps {
  property: Property;
}

export interface PropertyReviewsProps {
  property: Property;
}

export interface PropertyLocationProps {
  property: Property;
}

export interface PropertyBookingSidebarProps {
  property: Property;
}

export interface PropertyFAQProps {
  // FAQ data could be passed as props or fetched separately
}

export interface PropertyNeighborhoodInfoProps {
  property: Property;
}
