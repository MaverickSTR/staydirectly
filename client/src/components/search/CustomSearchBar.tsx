import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { MapPin, Users, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import '@/lib/animations.css';

interface CustomSearchBarProps {
  className?: string;
}

const locations = [
  { id: 'miami', name: 'Miami, FL' },
  { id: 'shenandoah', name: 'Shenandoah, VA' },
  { id: 'annapolis', name: 'Annapolis, MD' },
  { id: 'nashville', name: 'Nashville, TN' },
  { id: 'blue-ridge', name: 'Blue Ridge, GA' },
];

const CustomSearchBar: React.FC<CustomSearchBarProps> = ({ className }) => {
  const [, setLocation] = useLocation();
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [guests, setGuests] = useState<string>('1');
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);
  const searchBarRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close mobile search bar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setIsMobileExpanded(false);
      }
    };

    // Only add event listener when mobile search bar is expanded
    if (isMobileExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileExpanded]);

  const handleSearch = () => {
    // Build the search query with available parameters
    const searchParams = new URLSearchParams();

    if (selectedLocation) {
      searchParams.append('location', selectedLocation);
    }

    if (checkIn) {
      searchParams.append('checkIn', format(checkIn, 'yyyy-MM-dd'));
    }

    if (checkOut) {
      searchParams.append('checkOut', format(checkOut, 'yyyy-MM-dd'));
    }

    if (guests) {
      searchParams.append('guests', guests);
    }

    // Navigate to search results page with query parameters
    setLocation(`/search?${searchParams.toString()}`);
  };

  const toggleMobileExpansion = () => {
    setIsMobileExpanded(!isMobileExpanded);
  };

  return (
    <div
      ref={searchBarRef}
      className={cn("bg-white shadow-lg border relative border-gray-200 mx-auto transition-all duration-300 ease-in-out",
        isMobileExpanded
          ? "rounded-2xl flex flex-col items-stretch p-2 gap-2 w-full justify-center md:max-w-4xl h-fit px-8"
          : "rounded-full flex justify-center items-center p-0 w-10 h-10 md:h-fit md:rounded-full md:flex-row md:items-center md:p-1 md:w-fit  md:gap-4 md:px-4",
        className)}>

      {/* Mobile collapsed state - only search icon */}
      <div className={cn("md:hidden absolute top-0 right-0 -mt-1 -mr-1 z-10", isMobileExpanded ? "hidden" : "block")}>
        <Button
          className="rounded-full bg-[#FF385C] hover:bg-[#E00B41] text-white w-12 h-12 flex items-center justify-center transition-all duration-200 hover:shadow-md border-0 shadow-none"
          onClick={toggleMobileExpansion}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile expanded header with close button */}
      <div className={cn("md:hidden justify-between items-center mb-2", isMobileExpanded ? "flex" : "hidden")}>
        <h3 className="text-lg text-center font-semibold text-gray-800">Search Properties</h3>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full p-2 hover:bg-gray-100 shadow-lg transition-colors duration-200 w-12 h-12"
          onClick={toggleMobileExpansion}
          aria-label="Close search"
        >
          <X className="h-5 w-5 text-gray-600" />
        </Button>
      </div>

      {/* Search fields - visible on desktop always, on mobile only when expanded */}
      <div className={cn("flex transition-all duration-300 ease-in-out",
        isMobileExpanded
          ? "flex-col gap-2 opacity-100 max-h-[500px]"
          : "opacity-0 max-h-0 overflow-hidden md:opacity-100 md:max-h-none md:flex-row md:items-center md:gap-0")}>

        {/* Where */}
        <div className="flex-1 py-3 px-4 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 w-full rounded-xl md:rounded-none">
          <div className="font-medium text-xs mb-1 text-center text-gray-800">Where</div>
          <div className="flex items-center">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="border-0 p-0 h-auto font-normal text-gray-600 w-full [&>svg]:hidden text-center justify-center">
                <SelectValue placeholder="Search destinations" />
              </SelectTrigger>
              <SelectContent
                className="max-h-[300px] rounded-lg bg-white py-2 px-1 shadow-2xl border-0 w-auto min-w-[280px] md:min-w-[320px] overflow-auto"
                position="popper"
                sideOffset={5}
              >
                {locations.map((loc) => (
                  <SelectItem
                    key={loc.id}
                    value={loc.id}
                    className="hover:bg-gray-50 rounded-md py-3 px-4 transition-colors duration-150 text-base font-normal data-[state=checked]:bg-gray-50 data-[state=checked]:font-semibold whitespace-nowrap"
                  >
                    <div className="flex items-center w-full">
                      {selectedLocation === loc.id && (
                        <svg className="mr-3 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                        </svg>
                      )}
                      <span className={`whitespace-nowrap ${selectedLocation === loc.id ? 'w-full' : 'ml-8'}`}>
                        {loc.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Check in */}
        <div className="flex-1 py-3 px-4 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 w-full rounded-xl md:rounded-none">
          <div className="font-medium text-xs mb-1 text-center text-gray-800">Check in</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="p-0 h-auto font-normal text-center text-gray-600 w-full hover:bg-transparent"
              >
                {checkIn ? (
                  format(checkIn, 'MMM d, yyyy')
                ) : (
                  <span>Add dates</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-lg border-0 shadow-2xl" align="start">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={setCheckIn}
                initialFocus
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Check out */}
        <div className="flex-1 py-3 px-4 md:px-6 border-b md:border-b-0 md:border-r border-gray-200 w-full rounded-xl md:rounded-none">
          <div className="font-medium text-xs mb-1 text-center text-gray-800">Check out</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="p-0 h-auto font-normal text-center text-gray-600 w-full hover:bg-transparent"
              >
                {checkOut ? (
                  format(checkOut, 'MMM d, yyyy')
                ) : (
                  <span>Add dates</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-lg border-0 shadow-2xl" align="start">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={setCheckOut}
                initialFocus
                disabled={(date) =>
                  date < new Date() || (checkIn ? date <= checkIn : false)
                }
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Who */}
        <div className="flex-1 py-3 px-4 md:px-6 w-full rounded-xl md:rounded-none">
          <div className="font-medium text-xs mb-1 text-center text-gray-800">Who</div>
          <div className="flex items-center justify-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-normal text-center text-gray-600 w-full hover:bg-transparent"
                >
                  {parseInt(guests) > 0 ? (
                    <span>{parseInt(guests) === 1 ? '1 guest' : `${guests} guests`}</span>
                  ) : (
                    <span>Add guests</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-72 p-4 rounded-lg border-0 shadow-2xl"
                align="center"
                sideOffset={5}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-base font-medium">Adults</span>
                      <span className="text-sm text-gray-500">Ages 13 or above</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-gray-400"
                        onClick={() => {
                          const current = parseInt(guests);
                          if (current > 0) setGuests((current - 1).toString());
                        }}
                        disabled={parseInt(guests) === 0}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </Button>
                      <span className="w-5 text-center">{guests}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-full p-0 flex items-center justify-center border-gray-400"
                        onClick={() => {
                          const current = parseInt(guests);
                          setGuests((current + 1).toString());
                        }}
                        disabled={parseInt(guests) >= 16}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Search button - desktop always visible, mobile only when expanded */}
      <div className={cn("flex justify-center transition-all duration-300",
        isMobileExpanded
          ? "mt-4 opacity-100 hidden"
          : "opacity-0 md:opacity-100 md:justify-start md:pl-2 md:mt-0 ")}>
        <Button
          className="rounded-full bg-[#FF385C] hover:bg-[#E00B41] text-white w-14 h-14 md:w-12 md:h-12 flex items-center justify-center shadow-md transition-all duration-200 hover:shadow-lg"
          onClick={handleSearch}
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default CustomSearchBar;