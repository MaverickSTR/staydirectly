import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function HospitableConnect() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('');
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  
  // Get user's timezone when component mounts
  useEffect(() => {
    try {
      // Use Intl API to get the user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(userTimezone);
      console.log('Detected user timezone:', userTimezone);
    } catch (error) {
      console.error('Could not detect timezone:', error);
      // Fallback to a common timezone if detection fails
      setTimezone('America/New_York');
    }
  }, []);

  // Create customer and get auth link in one API call
  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      // Format phone number with +1 country code if provided
      const formattedPhone = phone ? `+1${phone}` : undefined;
      
      // Use detected timezone or fallback to America/New_York
      const userTimezone = timezone || 'America/New_York';
      
      const payload = {
        action: 'customer', // Action goes in the body, not query params
        email,
        name,
        ...(formattedPhone && { phone: formattedPhone }), // Only include phone if provided
        timezone: userTimezone,
      };
      
      console.log('🚀 Creating customer and auth link:', JSON.stringify(payload, null, 2));
      
      const response = await apiRequest('POST', '/api/hospitable/connect', payload);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Customer and auth link created:', data);
      
      // Check if we have both customer and auth URL
      if (data.customerId && data.authUrl) {
        toast({
          title: 'Ready to Connect!',
          description: 'Customer created and auth link generated successfully',
        });
        setCustomerId(data.customerId);
        setConnectUrl(data.authUrl);
      } else if (data.customerId) {
        toast({
          title: 'Partial Success',
          description: 'Customer created but auth link generation failed',
          variant: 'destructive'
        });
        setCustomerId(data.customerId);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create customer',
          variant: 'destructive'
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ Error creating customer:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to create customer and auth link',
        variant: 'destructive'
      });
    }
  });

  // Handle customer creation form submission
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only name and email are required
    if (!email || !name) {
      toast({
        title: 'Validation Error',
        description: 'Please provide name and email address',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate phone number format if provided (10 digits for US)
    if (phone && phone.length !== 10) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 10-digit US phone number or leave it blank',
        variant: 'destructive'
      });
      return;
    }
    
    createCustomerMutation.mutate();
  };

  // Handle OAuth window opening
  const handleConnect = () => {
    if (!connectUrl) return;

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2.5;
    
    const popup = window.open(
      connectUrl,
      'Connect with Hospitable',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Listen for the auth code from the popup
    window.addEventListener('message', (event) => {
      // Handle the auth code
      if (event.data.code) {
        handleAuthCode(event.data.code);
        if (popup) popup.close();
      } else if (event.data.error) {
        toast({
          title: 'Authentication Error',
          description: event.data.error,
          variant: 'destructive'
        });
        if (popup) popup.close();
      }
    });
  };

  // Exchange auth code for tokens
  const handleAuthCode = async (code: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/hospitable/token', { code });
      const tokenData = await response.json();
      
      if (tokenData.access_token) {
        setConnected(true);
        toast({
          title: 'Connected Successfully',
          description: 'Your Hospitable account has been connected!',
        });
      }
    } catch (error) {
      console.error('Error exchanging auth code for tokens:', error);
      toast({
        title: 'Token Exchange Failed',
        description: 'Could not complete the authentication process',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container max-w-2xl py-10 mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Connect with Hospitable</CardTitle>
          <CardDescription>
            Create your customer profile and connect to Hospitable in one simple step
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {connected ? (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Connected Successfully!</AlertTitle>
              <AlertDescription>
                Your Hospitable account has been connected. You can now import your listings.
              </AlertDescription>
            </Alert>
          ) : customerId ? (
            <div className="space-y-4">
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Ready to Connect!</AlertTitle>
                <AlertDescription>
                  Customer ID: <span className="font-mono font-medium">{customerId}</span>
                  <br />
                  Click below to connect your Hospitable account and import your listings.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleConnect} 
                className="text-white text-lg py-2 w-full bg-black hover:bg-gray-800"
              >
                Connect with Hospitable <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone Number <span className="text-muted-foreground">(optional)</span>
                </label>
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-muted px-3 py-2 border border-r-0 rounded-l-md text-sm">
                    +1
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      // Strip any non-numeric characters
                      const cleaned = e.target.value.replace(/\D/g, '');
                      setPhone(cleaned);
                    }}
                    className="rounded-l-none"
                    placeholder="9492907645"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional: U.S. phone number (10 digits). Country code +1 will be added automatically.
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={createCustomerMutation.isPending}
              >
                {createCustomerMutation.isPending ? 'Setting up connection...' : 'Create & Connect to Hospitable'}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col items-start border-t pt-4 space-y-2 text-xs text-muted-foreground">
          <p>
            <span className="font-medium">One-step process:</span> This will create your customer profile and generate a secure connection link to Hospitable.
          </p>
          <p>
            <span className="font-medium">What happens next:</span> You'll be redirected to Hospitable's secure authorization page to connect your account and import your Airbnb listings.
          </p>
          <p>
            <span className="font-medium">Automatic ID:</span> A unique customer ID will be generated automatically for your account.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}