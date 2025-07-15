## Getting Started 🚀

1. Contact the StayDirectly team to set up your account
2. Connect your existing property listings (Airbnb, Hospitable, etc.)
3. Customize your property information and photos
4. Launch your professional vacation rental website
5. Start attracting more guests!

->

## Installation & Setup 🛠️

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Git** for version control
- **Database** (PostgreSQL recommended)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd staydirectly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   Create a `.env` file in the root directory and configure your environment variables:
   ```env
   # Database
   DATABASE_URL=your_database_connection_string
   
   # Application
   NODE_ENV=development
   PORT=3000
   
   # API Keys (optional for full functionality)
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   STRIPE_SECRET_KEY=your_stripe_key
   HOSPITABLE_API_KEY=your_hospitable_key
   
   # Session Secret
   SESSION_SECRET=your_session_secret
   ```

4. **Database setup**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run dev:client` - Start only the frontend (port 5173)
- `npm run dev:server` - Start only the backend server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema changes
- `npm run check` - Run TypeScript type checking

### Project Structure

```
staydirectly/
├── client/          # React frontend application
├── server/          # Express backend API
├── shared/          # Shared types and schemas
├── migrations/      # Database migrations
└── package.json     # Project dependencies and scripts
```

### Development Tips

- **Hot reload**: Both client and server support hot reload during development
- **Database changes**: Run `npm run db:push` after schema modifications
- **Type checking**: Use `npm run check` to verify TypeScript types
- **Production build**: Use `npm run build` before deploying

## Getting Started for Users 🚀

1. Contact the StayDirectly team to set up your account
2. Connect your existing property listings (Airbnb, Hospitable, etc.)
3. Customize your property information and photos
4. Launch your professional vacation rental website
5. Start attracting more guests!