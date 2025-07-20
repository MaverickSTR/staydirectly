import React from 'react';
import { CustomSearchBar } from '@/components/search';

const HeroSection: React.FC = () => {
  return (
    <div className="relative min-h-[90vh] bg-gradient-to-b from-blue-50 to-white">
      {/* Main content container */}
      <div className="container mx-auto w-[90%] pt-24 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[90vh]">
          {/* Left side - Content */}
          <div className="md:space-y-24">
            <div className="text-center lg:text-left">
              <p className="text-gray-600 font-semibold text-sm uppercase tracking-wider mb-4">
                LUXURY VACATION HOMES
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Enjoy The Finest <span className="text-gray-600">Homes</span>
              </h1>
              <p className="text-gray-600 text-lg md:text-xl max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Discover exceptional properties and book directly with hosts worldwide. Experience luxury without the booking fees.
              </p>
            </div>
            {/* Search bar */}
            <div className="">
              <CustomSearchBar className="" />
            </div>
          </div>

          {/* Right side - Property Image */}
          <div className="relative">
            <div className="relative z-10">
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2075&q=80"
                alt="Modern luxury home"
                className="w-full h-auto rounded-2xl shadow-sm"
              />
              {/* Statistics */}
              <div className="flex justify-evenly gap-4 max-w-lg mx-auto lg:mx-0 pt-4 absolute bottom-0 right-0 bg-white  pb-4 pr-4 pl-6  w-full home-stat">
                <div className="text-center lg:text-left">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900">20+</h3>
                  <p className="text-gray-600 text-sm font-medium">Destinations</p>
                </div>
                <div className="text-center lg:text-left">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900">2K+</h3>
                  <p className="text-gray-600 text-sm font-medium"> Customers</p>
                </div>
                <div className="text-center lg:text-left">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900">500+</h3>
                  <p className="text-gray-600 text-sm font-medium">Properties </p>
                </div>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute -top-4 -right-4 w-full h-full bg-blue-100 rounded-2xl -z-10"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection; 