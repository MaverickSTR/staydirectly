import React from 'react';
import { CustomSearchBar } from '@/components/search';

const HeroSection: React.FC = () => {
  return (
    <div className="relative min-h-[60vh] md:min-h-[80vh] bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')" }}>
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      <div className="absolute inset-0 flex flex-col justify-center items-center text-white px-4">
        <h1 className="text-4xl md:text-7xl font-bold text-center mb-6">Find your next perfect stay</h1>
        <p className="text-xl md:text-3xl mb-8 text-center max-w-2xl">Book directly with hosts worldwide and save on booking fees</p>

        {/* Custom Search Widget */}
      </div>
      <div className="absolute bottom-20 left-0 right-0">
        <CustomSearchBar className="" />
      </div>

    </div>
  );
};

export default HeroSection; 