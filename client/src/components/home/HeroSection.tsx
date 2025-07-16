import React from 'react';
import { CustomSearchBar } from '@/components/search';

const HeroSection: React.FC = () => {
  return (
    <div className="relative min-h-[70vh] md:min-h-[80vh] bg-cover bg-center flex flex-col" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')" }}>
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      
      {/* Main content container */}
      <div className="relative z-10 flex flex-col justify-center items-center text-white px-4 flex-grow mt-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-7xl font-bold mb-6">Find your next perfect stay</h1>
          <p className="text-xl md:text-3xl max-w-[80%] md:max-w-2xl mx-auto">Book directly with hosts worldwide and save on booking fees</p>
        </div>
        
        {/* Search bar container */}
        <div className="w-full max-w-4xl mt-8">
          <CustomSearchBar className="" />
        </div>
      </div>
    </div>
  );
};

export default HeroSection; 