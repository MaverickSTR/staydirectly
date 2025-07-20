import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { 
  Menu, 
  User, 
  Home, 
  MapPin, 
  Heart, 
  LogIn, 
  Building, 
  ChevronDown, 
  Link as LinkIcon, 
  ListChecks, 
  Globe,
  LayoutDashboard
} from 'lucide-react';

const Navbar: React.FC = () => {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isHomePage = location === '/';

  return (
    <header className="headerGlass fixed top-0 left-1/2 transform -translate-x-1/2 z-50  shadow-sm w-[95%] rounded-md mt-2">
      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-black text-2xl font-black tracking-tight">StayDirectly</span>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8 flex-1 justify-center max-w-2xl mx-8 text-lg">
            <Link to="/featured" className="text-gray-800 hover:text-black transition-colors relative group font-medium">
              <span className="relative">
                Featured
                <span className="absolute left-0 bottom-[-4px] w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
              </span>
            </Link>
            <Link to="/destinations" className="text-gray-800 hover:text-black transition-colors relative group font-medium">
              <span className="relative">
                Destinations
                <span className="absolute left-0 bottom-[-4px] w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
              </span>
            </Link>
            <Link to="/search" className="text-gray-800 hover:text-black transition-colors relative group font-medium">
              <span className="relative">
                Properties
                <span className="absolute left-0 bottom-[-4px] w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
              </span>
            </Link>
          </nav>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/search" className="text-gray-800 hover:text-black transition-colors relative group">
              <span className="relative">
                Book Your Stay
                <span className="absolute left-0 bottom-[-4px] w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
              </span>
            </Link>
            
            {/* Markets Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center text-gray-800 hover:text-black transition-colors relative group">
                  <span className="flex items-center relative">
                    <Building className="mr-1 h-4 w-4" />
                    <span>Markets</span>
                    <ChevronDown className="ml-1 h-4 w-4" />
                    <span className="absolute left-0 bottom-[-4px] w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/city/shenandoah" className="flex cursor-pointer">
                    <MapPin className="mr-2 h-4 w-4" /> Shenandoah, VA
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/city/annapolis" className="flex cursor-pointer">
                    <MapPin className="mr-2 h-4 w-4" /> Annapolis, MD
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/city/nashville" className="flex cursor-pointer">
                    <MapPin className="mr-2 h-4 w-4" /> Nashville, TN
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/city/blue-ridge" className="flex cursor-pointer">
                    <MapPin className="mr-2 h-4 w-4" /> Blue Ridge, GA
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            

            {/* User Menu Dropdown - temporarily hidden
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full flex items-center gap-2 px-4">
                  <Menu className="h-4 w-4" />
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogIn className="mr-2 h-4 w-4" /> Sign in
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Home className="mr-2 h-4 w-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Heart className="mr-2 h-4 w-4" /> Favorites
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <MapPin className="mr-2 h-4 w-4" /> Host your place
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            */}
          </nav>
          
          {/* Mobile menu button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="py-4">
                <div className="space-y-4 mt-4">
                  <Link to="/" className="block py-2 px-4 hover:bg-gray-100 rounded-md">
                    Home
                  </Link>
                  <Link to="/search" className="block py-2 px-4 hover:bg-gray-100 rounded-md">
                    Book Your Stay
                  </Link>
                  
                  <Link to="/featured" className="block py-2 px-4 hover:bg-gray-100 rounded-md">
                    Featured
                  </Link>
                  <Link to="/destinations" className="block py-2 px-4 hover:bg-gray-100 rounded-md">
                    Destinations
                  </Link>
                  <Link to="/properties" className="block py-2 px-4 hover:bg-gray-100 rounded-md">
                    Properties
                  </Link>
                  
                  {/* Mobile Markets Section */}
                  <div className="block py-2 px-4">
                    <div className="font-medium mb-2 flex items-center">
                      <Building className="mr-2 h-4 w-4" />
                      Markets
                    </div>
                    <div className="ml-4 space-y-2">
                      <Link to="/city/shenandoah" className="flex items-center py-1 hover:text-black transition-colors">
                        <MapPin className="mr-2 h-4 w-4" />
                        Shenandoah, VA
                      </Link>
                      <Link to="/city/annapolis" className="flex items-center py-1 hover:text-black transition-colors">
                        <MapPin className="mr-2 h-4 w-4" />
                        Annapolis, MD
                      </Link>
                      <Link to="/city/nashville" className="flex items-center py-1 hover:text-black transition-colors">
                        <MapPin className="mr-2 h-4 w-4" />
                        Nashville, TN
                      </Link>
                      <Link to="/city/blue-ridge" className="flex items-center py-1 hover:text-black transition-colors">
                        <MapPin className="mr-2 h-4 w-4" />
                        Blue Ridge, GA
                      </Link>
                    </div>
                  </div>
                  

                  {/* Sign in link hidden for now
                  <Link href="#" className="block py-2 px-4 hover:bg-gray-100 rounded-md">
                    Sign in
                  </Link>
                  */}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* No mobile search bar - using hero search instead */}
      </div>
    </header>
  );
};

export default Navbar;
