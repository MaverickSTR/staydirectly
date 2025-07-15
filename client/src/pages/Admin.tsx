import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  Settings, 
  Users, 
  Database, 
  Activity,
  Globe,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Eye
} from 'lucide-react';
import PropertyEmbedsManager from '@/components/admin/PropertyEmbedsManager';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Query properties for dashboard stats
  const { data: properties } = useQuery({
    queryKey: ['/api/properties'],
  });

  // Calculate dashboard stats
  const stats = {
    totalProperties: properties?.length || 0,
    fullyConfigured: properties?.filter(p => p.bookingWidgetUrl && p.reviewWidgetCode).length || 0,
    needsSetup: properties?.filter(p => !p.bookingWidgetUrl || !p.reviewWidgetCode).length || 0,
    published: properties?.filter(p => p.publishedAt).length || 0,
  };
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your property rental platform</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-green-500" />
            System Active
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Properties
          </TabsTrigger>
          <TabsTrigger value="embeds" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Widgets
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Key Metrics Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProperties}</div>
                <p className="text-xs text-muted-foreground">Active listings</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fully Configured</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.fullyConfigured}</div>
                <p className="text-xs text-muted-foreground">With booking + reviews</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Need Setup</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.needsSetup}</div>
                <p className="text-xs text-muted-foreground">Missing widgets</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Published</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.published}</div>
                <p className="text-xs text-muted-foreground">Live properties</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('embeds')}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Manage Widgets
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('properties')}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  View Properties
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.open('/published-properties', '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Published Properties
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Booking Widgets</span>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Review Widgets</span>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Services</span>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="properties">
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Property Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-gray-600">Manage your property listings, availability, and settings.</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('/published-properties', '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Published
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('/customer-listings', '_blank')}
                    >
                      <Database className="h-4 w-4 mr-1" />
                      Customer Listings
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Total Properties</h4>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalProperties}</p>
                    <p className="text-sm text-gray-500">Active listings</p>
                  </Card>
                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Published</h4>
                    <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                    <p className="text-sm text-gray-500">Live on website</p>
                  </Card>
                  <Card className="p-4">
                    <h4 className="font-medium mb-2">Configuration Rate</h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.totalProperties > 0 ? Math.round((stats.fullyConfigured / stats.totalProperties) * 100) : 0}%
                    </p>
                    <p className="text-sm text-gray-500">Fully configured</p>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="embeds">
          <Card className="p-6">
            <PropertyEmbedsManager />
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">User Management</h3>
                <p className="text-gray-600 mb-4">User management functionality will be implemented in future updates.</p>
                <div className="text-sm text-gray-500">
                  <p>This will include:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Guest user management</li>
                    <li>• Admin user controls</li>
                    <li>• Role-based permissions</li>
                    <li>• User activity tracking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;