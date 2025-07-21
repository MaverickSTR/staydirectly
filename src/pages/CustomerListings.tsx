import React, { useState } from 'react';
import { extractPropertyIds } from '@/lib/hospitable/property-utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hospitable } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, Star, ExternalLink, Save, Users, Mail, Phone, Clock } from 'lucide-react';
import { HospitableListingImporter } from '@/components/hospitable';
import { DataRefreshScheduler, ListingDataDetail } from '@/components/hospitable';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation } from 'wouter';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Customer type definition based on Hospitable API response
type HospitableCustomer = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  timezone?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

// CustomerTable component with pagination and data fetching
const CustomerTable: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const customersPerPage = 10;
  
  // Fetch customers from Hospitable API
  const { data: customers, isLoading, isError, error } = useQuery({
    queryKey: ['hospitable-customers'],
    queryFn: async () => {
      const response = await fetch('/api/hospitable/customers');
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      return response.json() as Promise<HospitableCustomer[]>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
  
  // Calculate pagination
  const totalPages = Math.ceil((customers?.length || 0) / customersPerPage);
  const startIndex = (currentPage - 1) * customersPerPage;
  const endIndex = startIndex + customersPerPage;
  const currentCustomers = customers?.slice(startIndex, endIndex) || [];
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Hospitable Customers Directory
          </CardTitle>
          <CardDescription>Loading customers from Hospitable...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-black" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="mb-8 bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Hospitable Customers Directory
          </CardTitle>
          <CardDescription>Failed to load customers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">
            {error instanceof Error ? error.message : 'An error occurred while fetching customers'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Hospitable Customers Directory
        </CardTitle>
        <CardDescription>
          List of all customers from Hospitable ({customers?.length || 0} total customers)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>
            Showing {startIndex + 1}-{Math.min(endIndex, customers?.length || 0)} of {customers?.length || 0} customers
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium max-w-24 truncate" title={customer.id}>
                  {customer.id}
                </TableCell>
                <TableCell>{customer.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <a href={`mailto:${customer.email}`} className="text-gray-700 hover:text-gray-900 hover:underline">
                      {customer.email}
                    </a>
                  </div>
                </TableCell>
                <TableCell>
                  {customer.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <a href={`tel:${customer.phone}`} className="text-gray-700 hover:text-gray-900 hover:underline">
                        {customer.phone}
                      </a>
                    </div>
                  ) : (
                    <span className="text-gray-400">Not provided</span>
                  )}
                </TableCell>
                <TableCell>
                  {customer.timezone ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <Badge variant="outline">{customer.timezone}</Badge>
                    </div>
                  ) : (
                    <span className="text-gray-400">Not provided</span>
                  )}
                </TableCell>
                <TableCell>
                  {customer.status ? (
                    <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                      {customer.status}
                    </Badge>
                  ) : (
                    <span className="text-gray-400">Unknown</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/customer-listings/${customer.id}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        Load Listings
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={goToPrevious}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={goToNext}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Basic component to display customer listings
const CustomerListings: React.FC = () => {
  const [customerId, setCustomerId] = useState<string>("24RZHJ"); // Default to the example customer ID
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedListings, setSelectedListings] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Removed event listener since we now navigate to a separate page
  
  // Query for customer listings with enhanced caching
  const { data: listings, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['/api/hospitable/customers', customerId, 'listings'],
    queryFn: async () => {
      setIsSearching(true);
      try {
        const data = await hospitable.getCustomerListings(customerId);
        console.log(data);
        return data;
      } finally {
        setIsSearching(false);
      }
    },
    enabled: false, // Don't run the query automatically, wait for user action
    // Add caching configuration to prevent refetching on navigation
    staleTime: 1000 * 60 * 10, // 10 minutes - customer listings don't change frequently
    gcTime: 1000 * 60 * 60, // 1 hour - keep in cache for an hour
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch when reconnecting
  });

  // Mutation to mark properties for creation of property pages
  const markForPublishingMutation = useMutation({
    mutationFn: async (selectedIds: string[]) => {
      return await hospitable.markListingsForPublishing(customerId, selectedIds);
    },
    onSuccess: () => {
      toast({
        title: "Properties marked for publishing",
        description: (
          <div className="space-y-2">
            <p>{`Successfully marked ${Object.keys(selectedListings).filter(id => selectedListings[id]).length} properties for publishing.`}</p>
            <div className="pt-1">
              <Link to="/published-properties" className="text-black underline hover:text-gray-700">
                View published properties
              </Link>
            </div>
          </div>
        ),
      });
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hospitable/customers', customerId, 'listings'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to mark properties",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  });
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Hospitable Customer Listings</h1>
      
      {/* Hospitable Customers Directory Table */}
      <CustomerTable />
      
      
    </div>
  );
};

export default CustomerListings;