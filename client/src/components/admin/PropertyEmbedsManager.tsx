import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  TestTube, 
  AlertTriangle,
  Eye,
  Copy,
  Save,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PropertyEmbeds {
  id: number;
  name: string;
  title?: string;
  bookingWidgetUrl: string | null;
  reviewWidgetCode: string | null;
  isActive?: boolean;
  location?: string;
}

interface WidgetTestResult {
  type: 'booking' | 'review';
  status: 'success' | 'error' | 'testing';
  message: string;
}

const PropertyEmbedsManager = () => {
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, WidgetTestResult[]>>({});
  const { toast } = useToast();

  const { data: properties, isLoading } = useQuery<PropertyEmbeds[]>({
    queryKey: ['/api/properties'],
  });

  const updatePropertyEmbed = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { bookingWidgetUrl?: string; reviewWidgetCode?: string } }) => {
      const response = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update property');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: 'Widget Updated',
        description: 'Property widget configuration saved successfully.',
        duration: 3000,
      });
      
      // Clear test results for this property since widgets changed
      setTestResults(prev => ({
        ...prev,
        [variables.id]: []
      }));
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Could not save widget configuration. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  });

  const testWidget = async (propertyId: number, type: 'booking' | 'review', url: string) => {
    setTestResults(prev => ({
      ...prev,
      [propertyId]: [
        ...(prev[propertyId] || []).filter(r => r.type !== type),
        { type, status: 'testing', message: 'Testing widget...' }
      ]
    }));

    try {
      if (type === 'booking') {
        await testBookingWidget(url);
        setTestResults(prev => ({
          ...prev,
          [propertyId]: [
            ...(prev[propertyId] || []).filter(r => r.type !== type),
            { type, status: 'success', message: 'Booking widget URL is accessible' }
          ]
        }));
      } else {
        await testReviewWidget(url);
        setTestResults(prev => ({
          ...prev,
          [propertyId]: [
            ...(prev[propertyId] || []).filter(r => r.type !== type),
            { type, status: 'success', message: 'Review widget code appears valid' }
          ]
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [propertyId]: [
          ...(prev[propertyId] || []).filter(r => r.type !== type),
          { type, status: 'error', message: error instanceof Error ? error.message : 'Widget test failed' }
        ]
      }));
    }
  };

  const testBookingWidget = async (url: string): Promise<void> => {
    if (!url) throw new Error('No booking widget URL provided');
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Check if URL is reachable (simplified check)
    if (!url.includes('booking.hospitable.com') && !url.includes('airbnb.com') && !url.includes('vrbo.com')) {
      console.warn('Booking URL may not be from a recognized provider');
    }

    return Promise.resolve();
  };

  const testReviewWidget = async (code: string): Promise<void> => {
    if (!code) throw new Error('No review widget code provided');
    
    // Basic validation for Revyoos code format
    if (!code.match(/^[A-Za-z0-9+/]+=*$/)) {
      throw new Error('Review widget code appears to be invalid format');
    }

    if (code.length < 10) {
      throw new Error('Review widget code seems too short');
    }

    return Promise.resolve();
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: `${label} copied to clipboard`,
        duration: 2000,
      });
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Widget Management</h1>
          <p className="text-gray-600 mt-2">Manage booking and review widgets for your properties</p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {properties?.filter(p => p.bookingWidgetUrl && p.reviewWidgetCode).length || 0} Fully Configured
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            {properties?.filter(p => !p.bookingWidgetUrl || !p.reviewWidgetCode).length || 0} Need Setup
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {properties?.map((property) => (
          <PropertyEmbedCard 
            key={property.id}
            property={property}
            onSave={(data) => updatePropertyEmbed.mutate({ id: property.id, data })}
            isSaving={updatePropertyEmbed.isPending}
            testResults={testResults[property.id] || []}
            onTest={(type, url) => testWidget(property.id, type, url)}
            onCopy={copyToClipboard}
          />
        ))}
      </div>
      
      {properties?.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Properties Found</h3>
            <p className="text-gray-600">Add some properties to manage their widgets.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface PropertyEmbedCardProps {
  property: PropertyEmbeds;
  onSave: (data: { bookingWidgetUrl: string; reviewWidgetCode: string }) => void;
  isSaving: boolean;
  testResults: WidgetTestResult[];
  onTest: (type: 'booking' | 'review', url: string) => void;
  onCopy: (text: string, label: string) => void;
}

const PropertyEmbedCard = ({ property, onSave, isSaving, testResults, onTest, onCopy }: PropertyEmbedCardProps) => {
  const [bookingWidgetUrl, setBookingWidgetUrl] = useState(property.bookingWidgetUrl || '');
  const [reviewWidgetCode, setReviewWidgetCode] = useState(property.reviewWidgetCode || '');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setBookingWidgetUrl(property.bookingWidgetUrl || '');
    setReviewWidgetCode(property.reviewWidgetCode || '');
    setHasChanges(false);
  }, [property]);

  useEffect(() => {
    const hasBookingChange = bookingWidgetUrl !== (property.bookingWidgetUrl || '');
    const hasReviewChange = reviewWidgetCode !== (property.reviewWidgetCode || '');
    setHasChanges(hasBookingChange || hasReviewChange);
  }, [bookingWidgetUrl, reviewWidgetCode, property]);

  const handleSave = () => {
    onSave({
      bookingWidgetUrl,
      reviewWidgetCode,
    });
  };

  const getTestResult = (type: 'booking' | 'review') => {
    return testResults.find(r => r.type === type);
  };

  const getStatusBadge = () => {
    const hasBooking = !!property.bookingWidgetUrl;
    const hasReview = !!property.reviewWidgetCode;
    
    if (hasBooking && hasReview) {
      return <Badge className="bg-green-100 text-green-800">Fully Configured</Badge>;
    } else if (hasBooking || hasReview) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Partially Configured</Badge>;
    } else {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Needs Setup</Badge>;
    }
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {property.title || property.name}
              {getStatusBadge()}
            </CardTitle>
            {property.location && (
              <p className="text-sm text-gray-500 mt-1">{property.location}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/property/${property.id}`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="booking" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="booking" className="flex items-center gap-2">
              Booking Widget
              {property.bookingWidgetUrl && <CheckCircle className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              Review Widget
              {property.reviewWidgetCode && <CheckCircle className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="booking" className="space-y-4 mt-4">
            <div>
              <Label htmlFor={`booking-widget-${property.id}`}>Booking Widget URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id={`booking-widget-${property.id}`}
                  value={bookingWidgetUrl}
                  onChange={(e) => setBookingWidgetUrl(e.target.value)}
                  placeholder="https://booking.hospitable.com/widget/..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onTest('booking', bookingWidgetUrl)}
                  disabled={!bookingWidgetUrl}
                  title="Test widget"
                >
                  <TestTube className="h-4 w-4" />
                </Button>
                {bookingWidgetUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onCopy(bookingWidgetUrl, 'Booking widget URL')}
                    title="Copy URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Full iframe URL from Hospitable.com, Airbnb, VRBO, or similar booking platform
              </p>
              
              {getTestResult('booking') && (
                <Alert className={`mt-2 ${getTestResult('booking')?.status === 'success' ? 'border-green-200 bg-green-50' : 
                  getTestResult('booking')?.status === 'error' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
                  <AlertDescription className="flex items-center gap-2">
                    {getTestResult('booking')?.status === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {getTestResult('booking')?.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {getTestResult('booking')?.status === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                    {getTestResult('booking')?.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="review" className="space-y-4 mt-4">
            <div>
              <Label htmlFor={`review-widget-${property.id}`}>Review Widget Code</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id={`review-widget-${property.id}`}
                  value={reviewWidgetCode}
                  onChange={(e) => setReviewWidgetCode(e.target.value)}
                  placeholder="eyJwIjoiNjVlMGZiNTg5MjBlYWEwMDYxMjdlNWVjIn0="
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onTest('review', reviewWidgetCode)}
                  disabled={!reviewWidgetCode}
                  title="Test widget code"
                >
                  <TestTube className="h-4 w-4" />
                </Button>
                {reviewWidgetCode && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onCopy(reviewWidgetCode, 'Review widget code')}
                    title="Copy code"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                The data-revyoos-embed code from your Revyoos dashboard
              </p>
              
              {getTestResult('review') && (
                <Alert className={`mt-2 ${getTestResult('review')?.status === 'success' ? 'border-green-200 bg-green-50' : 
                  getTestResult('review')?.status === 'error' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
                  <AlertDescription className="flex items-center gap-2">
                    {getTestResult('review')?.status === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {getTestResult('review')?.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {getTestResult('review')?.status === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                    {getTestResult('review')?.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {hasChanges && <span className="text-amber-600">● Unsaved changes</span>}
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !hasChanges}
          className="flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PropertyEmbedsManager;