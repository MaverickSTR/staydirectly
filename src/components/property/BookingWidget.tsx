import React, { useState, useRef, useEffect } from 'react';
import { Loader2, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BookingWidgetProps {
    url: string;
    propertyName: string;
    propertyId: number;
    className?: string;
}

/**
 * Enhanced booking widget component with better error handling and loading states
 */
const BookingWidget: React.FC<BookingWidgetProps> = ({
    url,
    propertyName,
    propertyId,
    className = "w-full min-h-[700px] lg:min-h-[800px]"
}) => {
    const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        // Reset state when URL changes
        setLoadingState('loading');
        setErrorMessage('');

        // Set a timeout to detect if iframe fails to load
        timeoutRef.current = setTimeout(() => {
            if (loadingState === 'loading') {
                setLoadingState('error');
                setErrorMessage('Booking widget is taking too long to load. Please try refreshing.');
            }
        }, 15000); // 15 seconds timeout

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [url, loadingState]);

    const handleIframeLoad = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setLoadingState('loaded');
    };

    const handleIframeError = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setLoadingState('error');
        setErrorMessage('Failed to load booking widget. The widget may be temporarily unavailable.');
    };

    const handleRetry = () => {
        setLoadingState('loading');
        setErrorMessage('');

        // Force iframe reload by temporarily changing src
        if (iframeRef.current) {
            const currentSrc = iframeRef.current.src;
            iframeRef.current.src = 'about:blank';
            setTimeout(() => {
                if (iframeRef.current) {
                    iframeRef.current.src = currentSrc;
                }
            }, 100);
        }
    };

    const openInNewTab = () => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Validate URL format
    const isValidUrl = (() => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    })();

    if (!isValidUrl) {
        return (
            <div className={`${className} border border-red-200 rounded-lg flex flex-col items-center justify-center bg-red-50`}>
                <div className="text-center p-8">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-red-700 mb-2">Invalid Booking URL</h4>
                    <p className="text-red-600 mb-4">The booking widget URL is not properly configured.</p>
                    <p className="text-sm text-red-500">Please contact support for assistance.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            
            {/* Booking Iframe */}
            <iframe 
              id="booking-iframe" 
              sandbox="allow-top-navigation allow-scripts allow-same-origin" 
              style={{ width: '100%', height: '900px' }} 
              frameBorder="0" 
              src="https://booking.hospitable.com/widget/55ea1cea-3c99-40f7-b98b-3de392f74a36/1080590">
            </iframe>


            {/* Widget Attribution */}
            {loadingState === 'loaded' && (
                <div className="mt-2 text-xs text-gray-500 text-center">
                    Secure booking powered by {url.includes('hospitable.com') ? 'Hospitable' :
                        url.includes('airbnb.com') ? 'Airbnb' :
                            url.includes('vrbo.com') ? 'VRBO' : 'our booking partner'}
                </div>
            )}
        </div>
    );
};

export default BookingWidget; 