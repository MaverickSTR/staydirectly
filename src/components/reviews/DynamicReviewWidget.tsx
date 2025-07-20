import React, { useEffect, useState } from 'react';

interface Props {
  embedCode?: string; // This is property.reviewWidgetCode
  className?: string;
}

const DynamicReviewWidget: React.FC<Props> = ({ embedCode, className = "" }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!embedCode) return;

    // Dynamically create a container and inject HTML
    const container = document.getElementById('dynamic-review-widget');
    if (container) {
      container.innerHTML = embedCode;

      
      const timeout = setTimeout(() => {
        const widgetLoaded = container.querySelector('.ry-widget');
        if (!widgetLoaded) {
          setHasError(true);
        }
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [embedCode]);

  if (!embedCode) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-gray-500">Reviews not available</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-gray-500 mb-2">Unable to load reviews</p>
          <p className="text-xs text-gray-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return <div id="dynamic-review-widget" className={className} />;
};

export default DynamicReviewWidget;
