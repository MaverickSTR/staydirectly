# Deployment Troubleshooting Guide

## Issue: Live site shows minified server code instead of React app

This happens when the server fails to start and the deployment platform falls back to serving static files.

### Common Causes:

1. **Missing Environment Variables**
   - `NODE_ENV=production`
   - `DATABASE_URL` (if using database)
   - `HOSPITABLE_PLATFORM_TOKEN`
   - `GOOGLE_API_KEY`
   - `SESSION_SECRET`
   - `JWT_SECRET`

2. **Missing Dependencies**
   - Server dependencies not installed
   - Build dependencies missing

3. **Port Issues**
   - Server trying to use wrong port
   - Port already in use

4. **File Path Issues**
   - Static files not found
   - Wrong working directory

### Debugging Steps:

1. **Check Deployment Logs**
   ```bash
   # Look for these messages in your deployment logs:
   - "🚀 Server running on port 5000"
   - "🔍 Environment detection:"
   - "🔍 Static file serving debug:"
   ```

2. **Test Build Locally**
   ```bash
   npm run build:production
   cd dist
   npm install
   npm start
   ```

3. **Check Environment Variables**
   Make sure all required environment variables are set in your deployment platform.

4. **Verify File Structure**
   ```
   dist/
   ├── index.js          # Server bundle
   ├── package.json      # Production dependencies
   └── public/           # React app
       ├── index.html
       └── assets/
   ```

### Quick Fixes:

1. **Set NODE_ENV=production** in your deployment environment
2. **Ensure all environment variables are set**
3. **Check that your deployment platform runs `npm start`**
4. **Verify the server starts successfully**

### Deployment Platform Specific:

**Vercel:**
- Build Command: `npm run build:production`
- Output Directory: `dist`
- Install Command: `npm install`
- Start Command: `npm start`

**Railway:**
- Build Command: `npm run build:production`
- Start Command: `npm start`

**Render:**
- Build Command: `npm run build:production`
- Start Command: `npm start`

**Heroku:**
- Build Command: `npm run build:production`
- Start Command: `npm start`

### Testing Locally:

```bash
# Test the build process
node test-build.js

# Test the server locally
npm run build:production
cd dist
npm install
npm start
```

### Common Error Messages:

- `"Could not find the build directory"` - Client not built
- `"Missing required production environment variables"` - Missing env vars
- `"Failed to start server on port"` - Port or dependency issues
- `"Static files not found"` - Build output missing 