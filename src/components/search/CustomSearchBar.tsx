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
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

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
    
    // Close modal on mobile after search
    setIsModalOpen(false);
  };

  // Search form component to be reused in both desktop and mobile
  const SearchForm = () => (
    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
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
  );

  return (
    <div className={cn("relative", className)}>
      {/* Mobile - Custom Modal Trigger */}
      <div className="md:hidden">
        <Button
          className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full py-7 px-7 shadow-lg flex items-center justify-between"
          onClick={() => setIsModalOpen(true)}
        >
          <div className="flex items-center space-x-3">
            <Search className="h-5 w-5 text-gray-500" />
            <div className="text-left">
              <div className="font-medium">Where to?</div>
              <div className="text-sm text-gray-500">Anywhere • Any week • Add guests</div>
            </div>
          </div>
        </Button>

        {/* Custom Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            {/* Modal Content */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Search Properties</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2 hover:bg-gray-100 h-10 w-10"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X className="h-5 w-5 text-gray-600" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <SearchForm />
                </div>
                
                <Button
                  className="w-full mt-6 bg-[#FF385C] hover:bg-[#E00B41] text-white py-4 rounded-full text-lg font-medium"
                  onClick={handleSearch}
                >
                  <Search className="h-5 w-5 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop - Inline Search Bar */}
      <div className="hidden md:block">
        <div className="bg-white shadow-lg border border-gray-200 rounded-full flex items-center  p-1 gap-0 w-fit ">
          <SearchForm />
          <div className="flex justify-center pl-2 w-full">
            <Button
              className="rounded-full bg-gray-600 hover:bg-gray-700 text-white w-14 h-14 flex items-center justify-center shadow-md transition-all duration-200 hover:shadow-lg"
              onClick={handleSearch}
            >
              <Search size={30} className=" text-xl" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomSearchBar;