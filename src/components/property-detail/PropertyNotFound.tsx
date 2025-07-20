import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

const PropertyNotFound: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-red-500 mb-2">Property Not Found</h1>
            <p className="text-gray-600 mb-6">
              The property you are looking for does not exist or has been removed.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => window.history.back()} 
              className="w-full sm:w-auto"
            >
              <Search className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full sm:w-auto"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyNotFound; 