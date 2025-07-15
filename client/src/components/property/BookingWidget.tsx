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
            {/* Loading State */}
            {loadingState === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-black mb-4" />
                    <p className="text-gray-600">Loading booking widget...</p>
                    <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                </div>
            )}

            {/* Error State */}
            {loadingState === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                    <div className="text-center p-8 max-w-md">
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-700 mb-2">Booking Widget Unavailable</h4>
                        <p className="text-gray-600 mb-4">{errorMessage}</p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={handleRetry} variant="outline" className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Try Again
                            </Button>
                            <Button onClick={openInNewTab} className="flex items-center gap-2">
                                <ExternalLink className="h-4 w-4" />
                                Open in New Tab
                            </Button>
                        </div>

                        <Alert className="mt-6 text-left">
                            <AlertDescription>
                                <strong>Alternative booking options:</strong><br />
                                • Call us directly: (555) 123-4567<br />
                                • Email: bookings@staydirectly.com<br />
                                • Try opening the booking page in a new tab
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
            )}

            {/* Booking Iframe */}
            <iframe
                ref={iframeRef}
                id={`booking-iframe-${propertyId}`}
                src={url}
                title={`Book ${propertyName}`}
                className="w-full h-full border-0 rounded-lg"
                sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-popups"
                scrolling="no"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{
                    minHeight: '700px',
                    height: '100%',
                }}
            />

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