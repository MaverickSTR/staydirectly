import React from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
    id: number;
    question: string;
    answer: string;
}

const faqData: FAQItem[] = [
    {
        id: 1,
        question: "How do I book a property?",
        answer: "You can book a property by clicking on the property card, viewing the details, and using the booking widget to select your dates and complete the reservation."
    },
    {
        id: 2,
        question: "What is the cancellation policy?",
        answer: "Cancellation policies vary by property. You can find the specific cancellation policy for each property on its detail page before booking."
    },
    {
        id: 3,
        question: "Are pets allowed?",
        answer: "Pet policies vary by property. Some properties are pet-friendly while others are not. Check the property details or contact the host directly for specific pet policies."
    },
    {
        id: 4,
        question: "How do I contact customer support?",
        answer: "You can contact our customer support team through the contact form on our website or by emailing support@staydirectly.com. We're here to help 24/7."
    },
    {
        id: 5,
        question: "Is there a security deposit required?",
        answer: "Security deposit requirements vary by property. If a security deposit is required, it will be clearly stated on the property listing and during the booking process."
    }
];

const FAQ: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
                <h2 className="text-display text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-center mb-3">
                    Frequently Asked Questions
                </h2>
                <p className="text-lg text-gray-600">
                    Find answers to common questions about our platform
                </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
                {faqData.map((item) => (
                    <AccordionItem key={item.id} value={`item-${item.id}`}>
                        <AccordionTrigger className="text-left">
                            {item.question}
                        </AccordionTrigger>
                        <AccordionContent>
                            <p className="text-gray-700 leading-relaxed">
                                {item.answer}
                            </p>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            <div className="mt-8 text-center">
                <p className="text-gray-600">
                    Still have questions?{' '}
                    <a
                        href="mailto:support@staydirectly.com"
                        className="text-gray-900 hover:text-gray-700 font-medium"
                    >
                        Contact our support team
                    </a>
                </p>
            </div>
        </div>
    );
};

export default FAQ; 