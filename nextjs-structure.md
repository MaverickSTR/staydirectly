# Next.js Folder Structure for StayDirectly

## Root Structure
```
staydirectly-nextjs/
├── app/                          # Next.js 13+ App Router
│   ├── (auth)/                   # Route groups for auth pages
│   ├── (dashboard)/              # Route groups for dashboard pages
│   ├── api/                      # API routes
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # Reusable components
│   ├── admin/                    # Admin-specific components
│   ├── common/                   # Shared/common components
│   ├── destinations/             # Destination-related components
│   ├── home/                     # Home page components
│   ├── hospitable/               # Hospitable integration components
│   ├── layout/                   # Layout components
│   ├── map/                      # Map components
│   ├── property/                 # Property-related components
│   ├── property-detail/          # Property detail components
│   ├── reviews/                  # Review components
│   ├── search/                   # Search components
│   └── ui/                       # UI components (shadcn/ui)
├── hooks/                        # Custom React hooks
├── lib/                          # Utility libraries
│   ├── hospitable/               # Hospitable API utilities
│   └── utils.ts                  # General utilities
├── types/                        # TypeScript type definitions
├── public/                       # Static assets
├── styles/                       # Additional styles
├── middleware.ts                 # Next.js middleware
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies
```

## Detailed App Router Structure

### App Directory (`app/`)
```
app/
├── (auth)/                       # Route group for authentication
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (dashboard)/                  # Route group for dashboard
│   ├── admin/
│   │   └── page.tsx
│   ├── customer-listings/
│   │   ├── page.tsx
│   │   └── [customerId]/
│   │       └── page.tsx
│   ├── hospitable-integration/
│   │   └── page.tsx
│   ├── published-properties/
│   │   └── page.tsx
│   └── property-images/
│       └── [slug]/
│           └── page.tsx
├── api/                          # API routes
│   ├── auth/
│   │   └── route.ts
│   ├── properties/
│   │   ├── route.ts
│   │   └── [id]/
│   │       └── route.ts
│   ├── cities/
│   │   ├── route.ts
│   │   └── [name]/
│   │       └── route.ts
│   ├── hospitable/
│   │   ├── customers/
│   │   │   └── route.ts
│   │   ├── listings/
│   │   │   └── route.ts
│   │   └── import/
│   │       └── route.ts
│   └── webhooks/
│       └── route.ts
├── city/
│   └── [name]/
│       └── page.tsx
├── property/
│   ├── [slug]/
│   │   └── page.tsx
│   └── images/
│       └── [slug]/
│           └── page.tsx
├── search/
│   └── page.tsx
├── connect/
│   └── page.tsx
├── import/
│   └── page.tsx
├── hospitable-search/
│   └── page.tsx
├── api-properties/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx
├── globals.css
├── layout.tsx
├── loading.tsx
├── not-found.tsx
└── page.tsx
```

## Components Structure

### Components Directory (`components/`)
```
components/
├── admin/
│   ├── PropertyEmbedsManager.tsx
│   └── index.ts
├── common/
│   ├── FAQ.tsx
│   ├── TravelGuideCard.tsx
│   └── index.ts
├── destinations/
│   ├── DestinationCard.tsx
│   ├── FeaturedDestinations.tsx
│   ├── NeighborhoodCard.tsx
│   └── index.ts
├── home/
│   ├── FeaturedProperties.tsx
│   ├── HeroSection.tsx
│   ├── TestimonialCard.tsx
│   ├── TestimonialsSection.tsx
│   └── index.ts
├── hospitable/
│   ├── AirbnbListingsImporter.tsx
│   ├── DataRefreshScheduler.tsx
│   ├── HospitableApiSetupInfo.tsx
│   ├── HospitableListingImporter.tsx
│   ├── HospitablePropertiesList.tsx
│   ├── HospitableSearchBar.tsx
│   ├── HospitableSearchWidget.tsx
│   ├── ListingDataDetail.tsx
│   └── index.ts
├── layout/
│   ├── Footer.tsx
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   ├── SearchBar.tsx
│   └── index.ts
├── map/
│   ├── GoogleMapView.tsx
│   ├── MapView.tsx
│   └── index.ts
├── property/
│   ├── AirbnbImageOptimizer.tsx
│   ├── BookingWidget.tsx
│   ├── NearbyPlaces.tsx
│   ├── NeigborhoodInfo.tsx
│   ├── PropertyCard.tsx
│   ├── PropertyGallery.tsx
│   ├── RefreshImagesButton.tsx
│   └── index.ts
├── property-detail/
│   ├── AmenityIcon.tsx
│   ├── PropertyBasicInfo.tsx
│   ├── PropertyHeader.tsx
│   ├── PropertyLoadingSkeleton.tsx
│   ├── PropertyNotFound.tsx
│   ├── types.ts
│   ├── utils.ts
│   └── index.ts
├── reviews/
│   ├── DynamicReviewWidget.tsx
│   ├── EnhancedReviewWidget.tsx
│   ├── ReviewFallback.tsx
│   ├── RevyoosDirectEmbed.tsx
│   ├── RevyoosIframe.tsx
│   ├── RevyoosScriptLoader.tsx
│   ├── RevyoosScriptWidget.tsx
│   ├── RevyoosWidget.tsx
│   └── index.ts
├── search/
│   ├── CustomSearchBar.tsx
│   ├── FilterList.tsx
│   ├── Pagination.tsx
│   ├── SearchWidget.tsx
│   └── index.ts
├── ui/                          # shadcn/ui components
│   ├── accordion.tsx
│   ├── alert-dialog.tsx
│   ├── alert.tsx
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── button.tsx
│   ├── calendar.tsx
│   ├── card.tsx
│   ├── carousel.tsx
│   ├── checkbox.tsx
│   ├── collapsible.tsx
│   ├── command.tsx
│   ├── context-menu.tsx
│   ├── dialog.tsx
│   ├── drawer.tsx
│   ├── dropdown-menu.tsx
│   ├── form.tsx
│   ├── hover-card.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── menubar.tsx
│   ├── navigation-menu.tsx
│   ├── pagination.tsx
│   ├── popover.tsx
│   ├── progress.tsx
│   ├── radio-group.tsx
│   ├── resizable.tsx
│   ├── scroll-area.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── sidebar.tsx
│   ├── skeleton.tsx
│   ├── slider.tsx
│   ├── switch.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   ├── toast.tsx
│   ├── toaster.tsx
│   ├── toggle.tsx
│   ├── toggle-group.tsx
│   ├── tooltip.tsx
│   └── index.ts
└── index.ts
```

## Hooks Structure

### Hooks Directory (`hooks/`)
```
hooks/
├── use-debounced-search.ts
├── use-mobile.tsx
├── use-onboarding-flow.ts
├── use-property-images.ts
├── use-reviews.ts
├── use-toast.ts
└── index.ts
```

## Lib Structure

### Lib Directory (`lib/`)
```
lib/
├── hospitable/
│   ├── api-client.ts
│   ├── config.ts
│   ├── index.ts
│   ├── onboarding-flow.ts
│   ├── property-utils.ts
│   ├── server-utils.ts
│   ├── types.ts
│   └── useHospitable.ts
├── animations.css
├── api.ts
├── queryClient.ts
├── revyoos.css
├── seo.tsx
├── slugify.ts
└── utils.ts
```

## Types Structure

### Types Directory (`types/`)
```
types/
├── index.ts
└── global.d.ts
```

## Configuration Files

### Root Configuration Files
```
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── postcss.config.js            # PostCSS configuration
├── .env.local                   # Environment variables
├── .env.example                 # Environment variables example
├── .gitignore                   # Git ignore file
└── README.md                    # Project documentation
```

## Key Differences from Vite/React

1. **App Router**: Uses Next.js 13+ App Router instead of React Router
2. **File-based Routing**: Pages are created as `page.tsx` files in directories
3. **API Routes**: Server-side API endpoints in `app/api/` directory
4. **Server Components**: Can use React Server Components for better performance
5. **Layout System**: Uses `layout.tsx` for shared layouts
6. **Loading States**: Uses `loading.tsx` for loading states
7. **Error Handling**: Uses `error.tsx` for error boundaries
8. **Not Found**: Uses `not-found.tsx` for 404 pages

## Migration Notes

1. **Routing**: Convert `wouter` routes to Next.js file-based routing
2. **API Calls**: Move server logic to `app/api/` routes
3. **State Management**: Consider using React Server Components where possible
4. **Styling**: Keep Tailwind CSS configuration
5. **Components**: Most components can be migrated directly
6. **Hooks**: Custom hooks can be reused
7. **Types**: TypeScript types can be reused
8. **Utilities**: Utility functions can be reused

## Package.json Dependencies

Key dependencies to include:
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@radix-ui/react-*": "^1.0.0",
    "tailwindcss": "^3.0.0",
    "lucide-react": "^0.300.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "framer-motion": "^10.0.0",
    "axios": "^1.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0"
  }
}
``` 