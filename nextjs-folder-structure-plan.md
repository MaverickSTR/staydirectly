# Next.js Folder Structure Plan for StayDirectly

## Complete Folder Structure

```
staydirectly-nextjs/
├── app/                          # Next.js 13+ App Router
│   ├── (auth)/                   # Route groups for auth pages
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/              # Route groups for dashboard pages
│   │   ├── admin/
│   │   │   └── page.tsx
│   │   ├── customer-listings/
│   │   │   ├── page.tsx
│   │   │   └── [customerId]/
│   │   │       └── page.tsx
│   │   ├── hospitable-integration/
│   │   │   └── page.tsx
│   │   ├── published-properties/
│   │   │   └── page.tsx
│   │   └── property-images/
│   │       └── [slug]/
│   │           └── page.tsx
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   │   └── route.ts
│   │   ├── properties/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── cities/
│   │   │   ├── route.ts
│   │   │   └── [name]/
│   │   │       └── route.ts
│   │   ├── hospitable/
│   │   │   ├── customers/
│   │   │   │   └── route.ts
│   │   │   ├── listings/
│   │   │   │   └── route.ts
│   │   │   └── import/
│   │   │       └── route.ts
│   │   └── webhooks/
│   │       └── route.ts
│   ├── city/
│   │   └── [name]/
│   │       └── page.tsx
│   ├── property/
│   │   ├── [slug]/
│   │   │   └── page.tsx
│   │   └── images/
│   │       └── [slug]/
│   │           └── page.tsx
│   ├── search/
│   │   └── page.tsx
│   ├── connect/
│   │   └── page.tsx
│   ├── import/
│   │   └── page.tsx
│   ├── hospitable-search/
│   │   └── page.tsx
│   ├── api-properties/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── not-found.tsx
│   └── page.tsx
├── components/                   # Reusable components
│   ├── admin/
│   │   ├── PropertyEmbedsManager.tsx
│   │   └── index.ts
│   ├── common/
│   │   ├── FAQ.tsx
│   │   ├── TravelGuideCard.tsx
│   │   └── index.ts
│   ├── destinations/
│   │   ├── DestinationCard.tsx
│   │   ├── FeaturedDestinations.tsx
│   │   ├── NeighborhoodCard.tsx
│   │   └── index.ts
│   ├── home/
│   │   ├── FeaturedProperties.tsx
│   │   ├── HeroSection.tsx
│   │   ├── TestimonialCard.tsx
│   │   ├── TestimonialsSection.tsx
│   │   └── index.ts
│   ├── hospitable/
│   │   ├── AirbnbListingsImporter.tsx
│   │   ├── DataRefreshScheduler.tsx
│   │   ├── HospitableApiSetupInfo.tsx
│   │   ├── HospitableListingImporter.tsx
│   │   ├── HospitablePropertiesList.tsx
│   │   ├── HospitableSearchBar.tsx
│   │   ├── HospitableSearchWidget.tsx
│   │   ├── ListingDataDetail.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── Footer.tsx
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   ├── SearchBar.tsx
│   │   └── index.ts
│   ├── map/
│   │   ├── GoogleMapView.tsx
│   │   ├── MapView.tsx
│   │   └── index.ts
│   ├── property/
│   │   ├── AirbnbImageOptimizer.tsx
│   │   ├── BookingWidget.tsx
│   │   ├── NearbyPlaces.tsx
│   │   ├── NeigborhoodInfo.tsx
│   │   ├── PropertyCard.tsx
│   │   ├── PropertyGallery.tsx
│   │   ├── RefreshImagesButton.tsx
│   │   └── index.ts
│   ├── property-detail/
│   │   ├── AmenityIcon.tsx
│   │   ├── PropertyBasicInfo.tsx
│   │   ├── PropertyHeader.tsx
│   │   ├── PropertyLoadingSkeleton.tsx
│   │   ├── PropertyNotFound.tsx
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── index.ts
│   ├── reviews/
│   │   ├── DynamicReviewWidget.tsx
│   │   ├── EnhancedReviewWidget.tsx
│   │   ├── ReviewFallback.tsx
│   │   ├── RevyoosDirectEmbed.tsx
│   │   ├── RevyoosIframe.tsx
│   │   ├── RevyoosScriptLoader.tsx
│   │   ├── RevyoosScriptWidget.tsx
│   │   ├── RevyoosWidget.tsx
│   │   └── index.ts
│   ├── search/
│   │   ├── CustomSearchBar.tsx
│   │   ├── FilterList.tsx
│   │   ├── Pagination.tsx
│   │   ├── SearchWidget.tsx
│   │   └── index.ts
│   ├── ui/                       # shadcn/ui components
│   │   ├── accordion.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── alert.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── carousel.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── command.tsx
│   │   ├── context-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── hover-card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── menubar.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── pagination.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── radio-group.tsx
│   │   ├── resizable.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   ├── toggle.tsx
│   │   ├── toggle-group.tsx
│   │   ├── tooltip.tsx
│   │   └── index.ts
│   └── index.ts
├── hooks/                        # Custom React hooks
│   ├── use-debounced-search.ts
│   ├── use-mobile.tsx
│   ├── use-onboarding-flow.ts
│   ├── use-property-images.ts
│   ├── use-reviews.ts
│   ├── use-toast.ts
│   └── index.ts
├── lib/                          # Utility libraries
│   ├── hospitable/
│   │   ├── api-client.ts
│   │   ├── config.ts
│   │   ├── index.ts
│   │   ├── onboarding-flow.ts
│   │   ├── property-utils.ts
│   │   ├── server-utils.ts
│   │   ├── types.ts
│   │   └── useHospitable.ts
│   ├── animations.css
│   ├── api.ts
│   ├── queryClient.ts
│   ├── revyoos.css
│   ├── seo.tsx
│   ├── slugify.ts
│   └── utils.ts
├── types/                        # TypeScript type definitions
│   ├── index.ts
│   └── global.d.ts
├── public/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── favicon.ico
├── styles/                       # Additional styles
│   └── globals.css
├── middleware.ts                 # Next.js middleware
├── next.config.js               # Next.js configuration
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── postcss.config.js            # PostCSS configuration
├── .env.local                   # Environment variables
├── .env.example                 # Environment variables example
├── .gitignore                   # Git ignore file
└── package.json                 # Dependencies
```

## Key Migration Points

### 1. Routing Changes
- **Current**: `wouter` routing in `App.tsx`
- **Next.js**: File-based routing in `app/` directory
- **Migration**: Each route becomes a `page.tsx` file

### 2. Component Organization
- **Keep**: All existing component structure
- **Move**: Components from `src/components/` to `components/`
- **Update**: Import paths to use `@/` alias

### 3. API Routes
- **Current**: Express server in `server/` directory
- **Next.js**: API routes in `app/api/` directory
- **Migration**: Convert Express routes to Next.js API routes

### 4. State Management
- **Keep**: React Query setup
- **Update**: Configure for Next.js App Router
- **Add**: Server Components where beneficial

### 5. Styling
- **Keep**: Tailwind CSS configuration
- **Update**: Paths in `tailwind.config.ts`
- **Add**: CSS variables for theming

### 6. Environment Variables
- **Current**: `VITE_*` variables
- **Next.js**: `NEXT_PUBLIC_*` for client-side
- **Migration**: Update environment variable names

## File Naming Conventions

### Pages
- `page.tsx` - Main page component
- `layout.tsx` - Layout wrapper
- `loading.tsx` - Loading state
- `error.tsx` - Error boundary
- `not-found.tsx` - 404 page

### API Routes
- `route.ts` - API endpoint handler
- `route.ts` in dynamic folders - Dynamic API routes

### Components
- PascalCase for component files
- `index.ts` for barrel exports
- Descriptive names matching functionality

## Configuration Files Needed

1. **next.config.js** - Next.js configuration
2. **tailwind.config.ts** - Tailwind CSS setup
3. **tsconfig.json** - TypeScript configuration
4. **postcss.config.js** - PostCSS setup
5. **.env.local** - Environment variables
6. **package.json** - Dependencies

## Migration Steps

1. **Setup Next.js project** with TypeScript and Tailwind
2. **Create folder structure** as outlined above
3. **Move components** from `src/components/` to `components/`
4. **Convert pages** from React Router to Next.js pages
5. **Migrate API routes** from Express to Next.js API routes
6. **Update imports** to use `@/` alias
7. **Configure environment variables** for Next.js
8. **Test and deploy**

## Benefits of This Structure

- **SEO Optimized**: Built-in metadata and static generation
- **Performance**: Server Components and automatic optimization
- **Developer Experience**: File-based routing and hot reloading
- **Scalability**: Organized component structure
- **Type Safety**: Full TypeScript support
- **Modern**: Latest React and Next.js features 