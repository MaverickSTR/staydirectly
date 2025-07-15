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
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">What Our Guests Say</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={index} testimonial={testimonial} />
        ))}
      </div>
    </div>
  );
};

export default TestimonialsSection; 