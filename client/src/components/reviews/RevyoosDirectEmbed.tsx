import React, { useEffect, useRef, useState } from 'react';
import '@/lib/revyoos.css';
import ReviewFallback from './ReviewFallback';
import { useToast } from '@/hooks/use-toast';

interface RevyoosDirectEmbedProps {
  reviewWidgetCode?: string;
  className?: string;
}

/**
 * Improved Revyoos review widget with better error handling and loading reliability.
 * Prevents script conflicts and provides better user feedback.
 */
const RevyoosDirectEmbed: React.FC<RevyoosDirectEmbedProps> = ({
  reviewWidgetCode,
  className = "w-full h-auto min-h-[600px]"
}) => {
  const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error' | 'fallback'>('loading');
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const attemptsRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!reviewWidgetCode || !containerRef.current) {
      setLoadingState('fallback');
      return;
    }

    setLoadingState('loading');
    attemptsRef.current = 0;

    const container = containerRef.current;
    
    // Clear previous content (important for client-side routing)
    container.innerHTML = '';

    // Check if Revyoos script is already loaded globally to prevent conflicts
    const existingScript = document.querySelector('script[src*="revyoos.com/js/widgetBuilder.js"]');
    
    const loadWidget = () => {
      attemptsRef.current++;
      
      // Create Revyoos target div
      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'revyoos-embed-widget';
      widgetDiv.setAttribute('data-revyoos-embed', reviewWidgetCode);
      widgetDiv.style.width = '100%';
      widgetDiv.style.minHeight = '400px';
      container.appendChild(widgetDiv);

      // Only add script if it doesn't exist
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.revyoos.com/js/widgetBuilder.js';
        script.defer = true;
        script.type = 'application/javascript';
        script.setAttribute('data-revyoos-widget', reviewWidgetCode);
        
        script.onload = () => {
          console.log('Revyoos script loaded successfully');
          checkForWidget();
        };
        
        script.onerror = () => {
          console.error('Failed to load Revyoos script');
          handleLoadError();
        };
        
        container.appendChild(script);
      } else {
        // Script already exists, just check for widget
        checkForWidget();
      }
    };

    const checkForWidget = () => {
      timeoutRef.current = setTimeout(() => {
        const widget = container.querySelector('.ry-widget');
        if (widget && widget.children.length > 0) {
          console.log('Revyoos widget loaded successfully');
          setLoadingState('loaded');
        } else if (attemptsRef.current < 3) {
          console.log(`Revyoos widget not found, attempt ${attemptsRef.current}. Retrying...`);
          container.innerHTML = ''; // Clear and retry
          loadWidget();
        } else {
          console.warn('Revyoos widget failed to load after 3 attempts');
          handleLoadError();
        }
      }, 3000); // Give more time for the widget to load
    };

    const handleLoadError = () => {
      setLoadingState('error');
      // Show error toast only once
      if (attemptsRef.current === 3) {
        toast({
          title: 'Reviews Widget Issue',
          description: 'Having trouble loading reviews. Showing fallback content.',
          variant: 'default',
          duration: 3000,
        });
      }
    };

    loadWidget();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Don't clear container on unmount if widget loaded successfully
      if (loadingState !== 'loaded') {
        container.innerHTML = '';
      }
    };
  }, [reviewWidgetCode, toast]);

  // Show fallback immediately if no widget code
  if (!reviewWidgetCode) {
    return <ReviewFallback className={className} />;
  }

  return (
    <div ref={containerRef} className={className + " relative"}>
      {loadingState === 'loading' && (
        <div className="w-full flex flex-col items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">Loading guest reviews...</p>
          <p className="text-xs text-gray-400 mt-2">This may take a few moments</p>
        </div>
      )}

      {(loadingState === 'error' || loadingState === 'fallback') && (
        <div className="space-y-4">
          {loadingState === 'error' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> Reviews are temporarily unavailable. Here are some recent guest experiences:
              </p>
            </div>
          )}
          <ReviewFallback className="fade-in" />
        </div>
      )}
    </div>
  );
};

export default RevyoosDirectEmbed;
