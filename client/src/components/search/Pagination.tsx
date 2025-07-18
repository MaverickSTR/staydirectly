import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // Generate array of page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    
    // Always include first page
    pages.push(1);
    
    // Add ellipsis if needed
    if (currentPage > 3) {
      pages.push('ellipsis1');
    }
    
    // Add pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i > 1 && i < totalPages) {
        pages.push(i);
      }
    }
    
    // Add ellipsis if needed
    if (currentPage < totalPages - 2) {
      pages.push('ellipsis2');
    }
    
    // Always include last page if there's more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  // Handle page button click
  const handlePageClick = (page: number) => {
    if (page !== currentPage) {
      onPageChange(page);
    }
  };
  
  // If there's only one page, don't render pagination
  if (totalPages <= 1) {
    return null;
  }
  
  return (
    <div className="flex flex-col items-center gap-4 mb-12">
      {/* Page info */}
      <div className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </div>
      
      <nav className="inline-flex rounded-md shadow-sm space-x-2" aria-label="Pagination">
        {/* Previous button */}
        <Button
          className="relative inline-flex items-center px-3 py-2 rounded-md  bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          onClick={() => handlePageClick(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <span className="sr-only">Previous</span>
          <ChevronLeft size={32} />
        </Button>
        
        {/* Page numbers */}
        {getPageNumbers().map((page, index) => {
          if (page === 'ellipsis1' || page === 'ellipsis2') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="relative inline-flex items-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700"
              >
                ...
              </span>
            );
          }
          
          const pageNum = page as number;
          return (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? 'default' : 'outline'}
              className={`relative inline-flex items-center px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                pageNum === currentPage
                  ? 'bg-black text-white border-black'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => handlePageClick(pageNum)}
            >
              {pageNum}
            </Button>
          );
        })}
        
        {/* Next button */}
        <Button
          className="relative inline-flex items-center px-3 py-2 rounded-md  bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          onClick={() => handlePageClick(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <span className="sr-only">Next</span>
          <ChevronRight size={32}/>
        </Button>
      </nav>
    </div>
  );
};

export default Pagination;
