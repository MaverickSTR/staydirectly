import type { Property, CapacityData, BedroomDetail } from "./types";

// Function to convert amenity IDs to display names
export const getAmenityDisplayName = (amenityId: string): string => {
  // Convert from snake_case to Title Case for better display
  return amenityId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Get capacity information from property's capacity object or fallback to default properties
export const getCapacityData = (property: Property): CapacityData => {
  // Default to standard property fields
  let capacityData: CapacityData = {
    max: property.maxGuests,
    bedrooms: property.bedrooms,
    beds: property.bedrooms, // Fallback to bedrooms count
    bathrooms: property.bathrooms,
  };

  // If property has a capacity object from the API, use those values
  if (property.capacity) {
    capacityData = {
      max: property.capacity.max || capacityData.max,
      bedrooms: property.capacity.bedrooms || capacityData.bedrooms,
      beds: property.capacity.beds || capacityData.beds,
      bathrooms: property.capacity.bathrooms || capacityData.bathrooms,
    };
  }

  return capacityData;
};
