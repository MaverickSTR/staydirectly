import React from 'react';
import { HeroSection, FeaturedProperties, TestimonialsSection } from '@/components/home';
import { FAQ } from '@/components/common';
import { FeaturedDestinations } from '@/components/destinations';
import { Meta } from '@/lib/seo';

const Home: React.FC = () => {
  return (
    <>
      <Meta 
        title="StayDirectly - Book Unique Accommodations Directly"
        description="Find and book unique accommodations directly from hosts - no fees, no middlemen, just authentic stays."
        canonical="/"
      />

      <HeroSection />
      <FeaturedDestinations />
      <FeaturedProperties />
      <TestimonialsSection />
      <FAQ />
    </>
  );
};

export default Home;
