import React, { useEffect, useRef, useState } from 'react';
import '@/lib/revyoos.css';

interface RevyoosDirectEmbedProps {
  reviewWidgetCode?: string;
  className?: string;
}

/**
 * Revyoos review widget - exclusively uses Revyoos for all reviews
 */
const RevyoosDirectEmbed: React.FC<RevyoosDirectEmbedProps> = ({
  reviewWidgetCode,
  className = "w-full h-auto min-h-[600px]"
}) => {
  const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const containerRef = useRef<HTMLDivElement>(null);
  const attemptsRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!reviewWidgetCode || !containerRef.current) {
      setLoadingState('error');
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
          setLoadingState('error');
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
          setLoadingState('error');
        }
      }, 3000); // Give more time for the widget to load
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
  }, [reviewWidgetCode]);

  // Show error if no widget code
  if (!reviewWidgetCode) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-gray-500">Reviews not available</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className + " relative"}>
      {loadingState === 'loading' && (
        <div className="w-full flex flex-col items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">Loading Revyoos reviews...</p>
          <p className="text-xs text-gray-400 mt-2">This may take a few moments</p>
        </div>
      )}

      {loadingState === 'error' && (
        <div className="w-full flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-500 mb-2">Unable to load reviews</p>
            <p className="text-xs text-gray-400">Please try refreshing the page</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevyoosDirectEmbed;
