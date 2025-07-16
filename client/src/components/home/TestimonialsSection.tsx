import React from 'react';
import { TestimonialCard } from '@/components/home';

const TestimonialsSection: React.FC = () => {
  // Sample testimonials data
  const testimonials = [
    {
      quote: "Booking directly through StayDirectly was so easy and saved us money. The property was exactly as described and the host was incredibly helpful.",
      name: "Sarah L.",
      location: "New York, USA",
      avatarUrl: "https://randomuser.me/api/portraits/women/45.jpg",
      rating: 5
    },
    {
      quote: "As a frequent traveler, I appreciate the direct communication with property owners. It makes for a much more personal experience than traditional hotel stays.",
      name: "Michael T.",
      location: "London, UK",
      avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
      rating: 5
    },
    {
      quote: "The interface is clean and easy to use. I found exactly what I was looking for within minutes and the booking process was seamless. Highly recommend!",
      name: "Emma R.",
      location: "Sydney, Australia",
      avatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
      rating: 4.5
    },
    {
      quote: "Amazing platform! Found the perfect vacation rental for our family trip. The direct booking saved us hundreds in fees.",
      name: "Carlos M.",
      location: "Barcelona, Spain",
      avatarUrl: "https://randomuser.me/api/portraits/men/52.jpg",
      rating: 5
    },
    {
      quote: "The host was fantastic and the property exceeded our expectations. Will definitely use StayDirectly for future travels.",
      name: "Lisa K.",
      location: "Tokyo, Japan",
      avatarUrl: "https://randomuser.me/api/portraits/women/23.jpg",
      rating: 4.5
    },
    {
      quote: "Clean interface, great properties, and no hidden fees. This is how vacation rentals should be booked!",
      name: "David P.",
      location: "Toronto, Canada",
      avatarUrl: "https://randomuser.me/api/portraits/men/67.jpg",
      rating: 5
    }
  ];

  // Duplicate testimonials for seamless loop
  const allTestimonials = [...testimonials, ...testimonials];

  return (
    <div className="container px-4 py-16 mx-auto md:w-[90%]">
      <h2 className="text-display text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-center mb-12">What Our Guests Say</h2>
      
      {/* Carousel Container */}
      <div className="relative overflow-hidden">
        <div className="testimonials-scroll flex gap-8 w-max animate-scroll-right-to-left">
          {allTestimonials.map((testimonial, index) => (
            <div key={index} className="flex-shrink-0 w-80 md:w-96">
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestimonialsSection; 