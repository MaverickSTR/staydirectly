# Deployment Guide for StayDirectly

This guide covers multiple deployment options for your full-stack application.

## Prerequisites

- Node.js 18+ installed
- Git repository set up
- Database (PostgreSQL) configured
- Environment variables configured

## Option 1: Vercel + Railway (Recommended)

### Frontend Deployment (Vercel)

1. **Push your code to GitHub**

2. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

3. **Configure Vercel**:
   - Build Command: `npm run build:client`
   - Output Directory: `dist/public`
   - Install Command: `npm install`

4. **Set Environment Variables** in Vercel dashboard:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
   VITE_HOSPITABLE_CLIENT_TOKEN=your_hospitable_token
   VITE_HOSPITABLE_API_URL=https://your-backend-url.com
   ```

### Backend Deployment (Railway)

1. **Deploy to Railway**:
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Set environment variables
   - Deploy

2. **Environment Variables for Railway**:
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=your_postgresql_url
   JWT_SECRET=your_jwt_secret
   SESSION_SECRET=your_session_secret
   HOSPITABLE_PLATFORM_TOKEN=your_hospitable_token
   GOOGLE_API_KEY=your_google_maps_key
   ```

## Option 2: Docker Deployment

### Local Docker Deployment

1. **Build the Docker image**:
   ```bash
   npm run docker:build
   ```

2. **Run the container**:
   ```bash
   npm run docker:run
   ```

### Docker Compose (Recommended for production)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: staydirectly
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
```

## Option 3: Manual Server Deployment

### 1. Prepare Your Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
```

### 2. Deploy Application

```bash
# Clone repository
git clone your-repo-url
cd staydirectly

# Install dependencies
npm install

# Build for production
npm run build

# Set environment variables
cp .env.example .env.production
# Edit .env.production with your values

# Start with PM2
pm2 start dist/index.js --name "staydirectly"
pm2 save
pm2 startup
```

### 3. Configure Nginx (Optional)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Environment Variables Setup

### Required Variables

```env
# Application
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Security
JWT_SECRET=your-32-character-jwt-secret
SESSION_SECRET=your-32-character-session-secret
CSRF_SECRET=your-32-character-csrf-secret
ENCRYPTION_KEY=your-32-character-encryption-key

# API Keys
HOSPITABLE_PLATFORM_TOKEN=your-hospitable-token
GOOGLE_API_KEY=your-google-maps-key

# Frontend Variables
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
VITE_HOSPITABLE_CLIENT_TOKEN=your-hospitable-token
VITE_HOSPITABLE_API_URL=https://your-backend-url.com
```

### Optional Variables

```env
# Stripe Integration
STRIPE_SECRET_KEY=your-stripe-secret

# Admin Access
ADMIN_API_KEY=your-admin-key
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE staydirectly;
CREATE USER staydirectly_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE staydirectly TO staydirectly_user;
```

### 2. Run Migrations

```bash
npm run db:push
```

## SSL/HTTPS Setup

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Logs

### PM2 Monitoring

```bash
# View logs
pm2 logs staydirectly

# Monitor processes
pm2 monit

# Restart application
pm2 restart staydirectly
```

### Application Logs

```bash
# View application logs
tail -f /var/log/staydirectly/app.log

# View error logs
tail -f /var/log/staydirectly/error.log
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   sudo lsof -i :5000
   sudo kill -9 <PID>
   ```

2. **Database connection issues**:
   - Check DATABASE_URL format
   - Verify database is running
   - Check firewall settings

3. **Build failures**:
   ```bash
   npm run type-check
   npm run build:client
   npm run build:server
   ```

4. **Environment variables not loading**:
   - Ensure .env file exists
   - Check variable names match exactly
   - Restart application after changes

### Health Check Endpoint

Your application includes a health check at `/api/health`. Use this to verify deployment:

```bash
curl https://yourdomain.com/api/health
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database credentials protected
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Admin credentials secured
- [ ] Regular backups scheduled
- [ ] Monitoring and alerting set up

## Performance Optimization

1. **Enable compression**:
   ```javascript
   app.use(compression());
   ```

2. **Cache static assets**:
   ```javascript
   app.use(express.static('dist/public', {
     maxAge: '1y',
     etag: true
   }));
   ```

3. **Database optimization**:
   - Add indexes for frequently queried fields
   - Use connection pooling
   - Monitor query performance

## Backup Strategy

### Database Backups

```bash
# Create backup script
#!/bin/bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Schedule daily backups
0 2 * * * /path/to/backup-script.sh
```

### Application Backups

```bash
# Backup application files
tar -czf app_backup_$(date +%Y%m%d).tar.gz /path/to/app

# Backup environment files
cp .env.production backup_env_$(date +%Y%m%d)
```

## Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Review security configuration
5. Contact the development team 