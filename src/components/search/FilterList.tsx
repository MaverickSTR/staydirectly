import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import FilterButton from '@/components/ui/FilterButton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { formatPrice } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Filter, X } from 'lucide-react';

interface FilterListProps {
  onFilterChange: (filters: any) => void;
  currentFilters: any;
}

const FilterList: React.FC<FilterListProps> = ({ onFilterChange, currentFilters }) => {
  const [location, setLocation] = useLocation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPricePopoverOpen, setIsPricePopoverOpen] = useState(false);

  // Add console log to see current filters
  console.log('FilterList - Current filters:', currentFilters);

  // Price range filter
  const [priceRange, setPriceRange] = useState<[number, number]>([
    currentFilters.minPrice || 0,
    currentFilters.maxPrice || 1000
  ]);

  const [tempPriceRange, setTempPriceRange] = useState<[number, number]>(priceRange);

  // City filter
  const [city, setCity] = useState<string>(
    currentFilters.city || ''
  );

  // Property type filter
  const [propertyType, setPropertyType] = useState<string>(
    currentFilters.propertyType || ''
  );

  // Guests filter
  const [guests, setGuests] = useState<number>(
    currentFilters.guests || 0
  );

  // Bedrooms filter
  const [bedrooms, setBedrooms] = useState<number>(
    currentFilters.bedrooms || 0
  );

  // Bathrooms filter
  const [bathrooms, setBathrooms] = useState<number>(
    currentFilters.bathrooms || 0
  );

  // Amenities filter
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    currentFilters.amenities ? currentFilters.amenities.split(',') : []
  );

  // Apply filters and update URL
  const applyFilters = (newFilters: any) => {
    console.log('FilterList - Applying new filters:', newFilters);
    const filters = { ...currentFilters, ...newFilters };
    console.log('FilterList - Combined filters:', filters);

    onFilterChange(filters);

    // Update URL with filters
    const params = new URLSearchParams(location.split('?')[1] || '');

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });

    const newLocation = location.split('?')[0] + (params.toString() ? `?${params.toString()}` : '');
    console.log('FilterList - New location:', newLocation);
    setLocation(newLocation);

    // Close mobile sheet on filter apply (slight delay for better UX)
    setTimeout(() => setIsSheetOpen(false), 300);
  };

  // Toggle amenity selection
  const toggleAmenity = (amenity: string) => {
    console.log('FilterList - Toggling amenity:', amenity);
    let newAmenities;
    if (selectedAmenities.includes(amenity)) {
      newAmenities = selectedAmenities.filter(a => a !== amenity);
    } else {
      newAmenities = [...selectedAmenities, amenity];
    }
    console.log('FilterList - New amenities:', newAmenities);
    setSelectedAmenities(newAmenities);
    applyFilters({ amenities: newAmenities.length ? newAmenities.join(',') : undefined });
  };

  // Clear all filters
  const clearFilters = () => {
    setPriceRange([0, 1000]);
    setCity('');
    setPropertyType('');
    setGuests(0);
    setBedrooms(0);
    setBathrooms(0);
    setSelectedAmenities([]);

    // Clear ALL parameters including the search query
    const newLocation = location.split('?')[0]; // Remove all query parameters
    setLocation(newLocation);

    onFilterChange({});

    // Close mobile sheet when clearing filters
    setIsSheetOpen(false);
  };

  // Filter content component to be reused
  const FilterContent = ({ isMobile = false }) => (
    <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex flex-wrap gap-4'}`}>
      {/* City Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative">
            <FilterButton
              label={city || "City"}
              active={!!currentFilters.city}
              className={isMobile ? "w-full" : ""}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-2"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="space-y-1" onPointerDown={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              className={`w-full justify-start text-left ${city === '' ? 'bg-gray-100 text-black' : ''
                }`}
              onClick={() => {
                console.log('FilterList - Setting city: Any');
                setCity('');
                applyFilters({ city: undefined });
              }}
            >
              Any City
            </Button>
            {['Miami', 'New York', 'Los Angeles', 'Nashville', 'Chicago', 'San Francisco'].map((c) => (
              <Button
                key={c}
                variant="ghost"
                className={`w-full justify-start text-left ${city === c ? 'bg-gray-100 text-black' : ''
                  }`}
                onClick={() => {
                  console.log('FilterList - Setting city:', c);
                  setCity(c);
                  applyFilters({ city: c });
                }}
              >
                {c}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Guests Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative">
            <FilterButton
              label={guests > 0 ? `${guests} Guests` : "Guests"}
              active={currentFilters.guests !== undefined && currentFilters.guests > 0}
              className={isMobile ? "w-full" : ""}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-2"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="space-y-1" onPointerDown={(e) => e.stopPropagation()}>
            {[0, 1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
              <Button
                key={num}
                variant="ghost"
                className={`w-full justify-start text-left ${guests === num ? 'bg-gray-100 text-black' : ''
                  }`}
                onClick={() => {
                  console.log('FilterList - Setting guests:', num);
                  setGuests(num);
                  applyFilters({ guests: num > 0 ? num : undefined });
                }}
              >
                {num === 0 ? 'Any' : num === 12 ? '12+' : num} {num === 1 ? 'Guest' : 'Guests'}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Bedrooms Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative">
            <FilterButton
              label={bedrooms > 0 ? `${bedrooms}+ Bedrooms` : "Bedrooms"}
              active={currentFilters.bedrooms !== undefined && currentFilters.bedrooms > 0}
              className={isMobile ? "w-full" : ""}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-2"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="space-y-1" onPointerDown={(e) => e.stopPropagation()}>
            {[0, 1, 2, 3, 4, 5].map((num) => (
              <Button
                key={num}
                variant="ghost"
                className={`w-full justify-start text-left ${bedrooms === num ? 'bg-gray-100 text-black' : ''
                  }`}
                onClick={() => {
                  console.log('FilterList - Setting bedrooms:', num);
                  setBedrooms(num);
                  applyFilters({ bedrooms: num > 0 ? num : undefined });
                }}
              >
                {num === 0 ? 'Any' : num === 5 ? '5+' : num} {num === 1 ? 'Bedroom' : 'Bedrooms'}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Bathrooms Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative">
            <FilterButton
              label={bathrooms > 0 ? `${bathrooms}+ Bathrooms` : "Bathrooms"}
              active={currentFilters.bathrooms !== undefined && currentFilters.bathrooms > 0}
              className={isMobile ? "w-full" : ""}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-2"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="space-y-1" onPointerDown={(e) => e.stopPropagation()}>
            {[0, 1, 1.5, 2, 2.5, 3, 4].map((num) => (
              <Button
                key={num.toString()}
                variant="ghost"
                className={`w-full justify-start text-left ${bathrooms === num ? 'bg-gray-100 text-black' : ''
                  }`}
                onClick={() => {
                  console.log('FilterList - Setting bathrooms:', num);
                  setBathrooms(num);
                  applyFilters({ bathrooms: num > 0 ? num : undefined });
                }}
              >
                {num === 0 ? 'Any' : num === 4 ? '4+' : num} {num === 1 ? 'Bathroom' : 'Bathrooms'}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Price Range Filter */}
              <Popover open={isPricePopoverOpen} onOpenChange={setIsPricePopoverOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <FilterButton
              label={
                priceRange[0] === 0 && priceRange[1] === 1000
                  ? "Price Range"
                  : `${formatPrice(priceRange[0])} - ${formatPrice(priceRange[1])}`
              }
              active={
                currentFilters.minPrice !== undefined ||
                currentFilters.maxPrice !== undefined
              }
              className={isMobile ? "w-full" : ""}
            />
          </div>
        </PopoverTrigger>

                <PopoverContent
          className="w-80 p-4"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
        >
          <div
            className="space-y-4"
            style={{
              willChange: "transform",
              touchAction: "manipulation",
            }}
          >
            <h4 className="font-medium">Price Range</h4>

            <div className="pt-4">
              <Slider
                min={0}
                max={1000}
                step={10}
                value={tempPriceRange}
                onValueChange={(value: number[]) => setTempPriceRange([value[0], value[1]])}
                className="transition-all duration-150 ease-out"
                style={{ touchAction: "pan-y", willChange: "transform" }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span>{formatPrice(tempPriceRange[0])}</span>
              <span>{formatPrice(tempPriceRange[1])}</span>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                className="text-sm"
                onClick={() => {
                  console.log("FilterList - Resetting price range");
                  setTempPriceRange([0, 1000]);
                }}
              >
                Reset
              </Button>
              <Button
                className="text-sm"
                onClick={() => {
                  console.log("FilterList - Applying price range:", tempPriceRange);
                  setPriceRange(tempPriceRange);
                  applyFilters({ minPrice: tempPriceRange[0], maxPrice: tempPriceRange[1] });
                  setIsPricePopoverOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>


      {/* Amenities Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative">
            <FilterButton
              label={selectedAmenities.length > 0 ? `Amenities (${selectedAmenities.length})` : "Amenities"}
              active={selectedAmenities.length > 0}
              className={isMobile ? "w-full" : ""}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-4"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="space-y-4" onPointerDown={(e) => e.stopPropagation()}>
            <h4 className="font-medium">Amenities</h4>
            <div className="grid grid-cols-1 gap-2">
              {['WiFi', 'Pool', 'Kitchen', 'Air Conditioning', 'Washer/Dryer', 'Free Parking',
                'TV', 'Hot Tub', 'Gym', 'Pets Allowed', 'Workspace'].map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={`amenity-${amenity}`}
                      checked={selectedAmenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <Label
                      htmlFor={`amenity-${amenity}`}
                      className="text-sm cursor-pointer"
                    >
                      {amenity}
                    </Label>
                  </div>
                ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Property Type Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative">
            <FilterButton
              label={propertyType || "Property Type"}
              active={!!currentFilters.propertyType}
              className={isMobile ? "w-full" : ""}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-2"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="space-y-1" onPointerDown={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              className={`w-full justify-start text-left ${propertyType === '' ? 'bg-gray-100 text-black' : ''
                }`}
              onClick={() => {
                console.log('FilterList - Setting property type: Any');
                setPropertyType('');
                applyFilters({ propertyType: undefined });
              }}
            >
              Any Property Type
            </Button>
            {['Apartment', 'House', 'Villa', 'Condo', 'Cabin', 'Cottage'].map((type) => (
              <Button
                key={type}
                variant="ghost"
                className={`w-full justify-start text-left ${propertyType === type ? 'bg-gray-100 text-black' : ''
                  }`}
                onClick={() => {
                  console.log('FilterList - Setting property type:', type);
                  setPropertyType(type);
                  applyFilters({ propertyType: type });
                }}
              >
                {type}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters Button (only show if filters are applied) */}
      {Object.keys(currentFilters).length > 0 && (
        <Button
          variant="ghost"
          className={`text-black hover:text-gray-700 ${isMobile ? 'w-full' : ''}`}
          onClick={clearFilters}
        >
          Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <div>
      {/* Mobile Filters - Sheet */}
      <div className="lg:hidden">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full mb-4 flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {Object.keys(currentFilters).length > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full ml-2">
                  {Object.keys(currentFilters).length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-3xl">
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold">Filters <span className="text-sm text-gray-500">({Object.keys(currentFilters).length})</span></SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent isMobile={true} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Filters - Inline */}
      <div className="hidden lg:block">
        <FilterContent isMobile={false} />
      </div>
    </div>
  );
};

export default FilterList;
