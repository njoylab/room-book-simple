# Deployment Guide

This guide covers deploying the Meeting Room Booking System to various platforms and environments.

## Prerequisites

Before deploying, ensure you have:

1. **Airtable Setup**: Configured tables and API credentials
2. **Slack App**: Created and configured with OAuth
3. **Domain**: A custom domain for production (recommended)
4. **SSL Certificate**: HTTPS is required for Slack OAuth

## Platform-Specific Deployment

### Vercel (Recommended)

Vercel is the recommended platform for Next.js applications.

#### 1. Prepare Your Repository

```bash
# Ensure your code is in a Git repository
git init
git add .
git commit -m "Initial commit"

# Push to GitHub, GitLab, or Bitbucket
git remote add origin https://github.com/yourusername/room-book-simple.git
git push -u origin main
```

#### 2. Deploy to Vercel

1. **Sign up** at [vercel.com](https://vercel.com)
2. **Import your repository** from GitHub/GitLab/Bitbucket
3. **Configure environment variables** in the Vercel dashboard:

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_MEETING_ROOMS_TABLE=MeetingRooms
AIRTABLE_BOOKINGS_TABLE=Bookings

# Slack OAuth Configuration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Session Security
SESSION_SECRET=your-32-character-session-secret-here
SESSION_COOKIE_NAME=room_booking_user
SESSION_DURATION_HOURS=168

# Application Configuration
APP_TITLE=B4I
UPCOMING_MEETINGS_HOURS=24
APP_BASE_URL=https://yourdomain.com
NODE_ENV=production

# Security Headers (optional)
ALLOWED_ORIGINS=https://yourdomain.com
```

4. **Deploy**: Vercel will automatically build and deploy your application

#### 3. Configure Custom Domain

1. **Add custom domain** in Vercel dashboard
2. **Update DNS records** as instructed by Vercel
3. **Update Slack app settings**:
   - Redirect URL: `https://yourdomain.com/api/auth/slack`
   - Slash command URL: `https://yourdomain.com/api/slack/bot`

### Netlify

#### 1. Build Configuration

Create `netlify.toml` in your project root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 2. Deploy

1. **Sign up** at [netlify.com](https://netlify.com)
2. **Import your repository**
3. **Configure environment variables** (same as Vercel)
4. **Deploy**

### Docker Deployment

#### 1. Create Dockerfile

```dockerfile
# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AIRTABLE_API_KEY=${AIRTABLE_API_KEY}
      - AIRTABLE_BASE_ID=${AIRTABLE_BASE_ID}
      - SLACK_CLIENT_ID=${SLACK_CLIENT_ID}
      - SLACK_CLIENT_SECRET=${SLACK_CLIENT_SECRET}
      - SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - APP_BASE_URL=${APP_BASE_URL}
    restart: unless-stopped
```

#### 3. Deploy

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t room-book-simple .
docker run -p 3000:3000 --env-file .env.production room-book-simple
```

### Traditional Server Deployment

#### 1. Server Requirements

- **Node.js**: Version 18 or higher
- **PM2**: Process manager (recommended)
- **Nginx**: Reverse proxy (recommended)
- **SSL Certificate**: Let's Encrypt (free)

#### 2. Server Setup

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
sudo apt-get install nginx

# Install Certbot for SSL
sudo apt-get install certbot python3-certbot-nginx
```

#### 3. Application Deployment

```bash
# Clone your repository
git clone https://github.com/yourusername/room-book-simple.git
cd room-book-simple

# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Create environment file
cp .env.example .env.production
# Edit .env.production with your values

# Start with PM2
pm2 start npm --name "room-book-simple" -- start
pm2 save
pm2 startup
```

#### 4. Nginx Configuration

Create `/etc/nginx/sites-available/room-book-simple`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
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

Enable the site and get SSL certificate:

```bash
sudo ln -s /etc/nginx/sites-available/room-book-simple /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## Environment-Specific Configuration

### Development Environment

```env
NODE_ENV=development
APP_BASE_URL=https://your-ngrok-url.ngrok.io
SESSION_SECRET=dev-session-secret-32-chars-long
```

### Staging Environment

```env
NODE_ENV=staging
APP_BASE_URL=https://staging.yourdomain.com
SESSION_SECRET=staging-session-secret-32-chars-long
UPCOMING_MEETINGS_HOURS=24
```

### Production Environment

```env
NODE_ENV=production
APP_BASE_URL=https://yourdomain.com
SESSION_SECRET=production-session-secret-32-chars-long
UPCOMING_MEETINGS_HOURS=24
ALLOWED_ORIGINS=https://yourdomain.com
```

## Post-Deployment Checklist

### 1. Verify Application

- [ ] Application loads without errors
- [ ] Slack OAuth login works
- [ ] Room booking functionality works
- [ ] Calendar integration works
- [ ] Slack bot commands work

### 2. Security Verification

- [ ] HTTPS is enabled and working
- [ ] Environment variables are properly set
- [ ] Session secret is 32 characters long
- [ ] CORS is properly configured
- [ ] Rate limiting is working

### 3. Performance Optimization

- [ ] Enable compression in Nginx
- [ ] Configure caching headers
- [ ] Monitor application performance
- [ ] Set up logging and monitoring

### 4. Monitoring and Maintenance

- [ ] Set up error monitoring (Sentry, LogRocket)
- [ ] Configure uptime monitoring
- [ ] Set up automated backups
- [ ] Plan for regular updates

## Troubleshooting

### Common Issues

#### 1. OAuth Redirect Errors

**Problem**: Slack OAuth redirect fails
**Solution**: 
- Verify `APP_BASE_URL` matches your domain
- Check Slack app redirect URL configuration
- Ensure HTTPS is properly configured

#### 2. Session Issues

**Problem**: Users get logged out frequently
**Solution**:
- Verify `SESSION_SECRET` is exactly 32 characters
- Check `SESSION_DURATION_HOURS` setting
- Ensure cookies are properly configured

#### 3. Database Connection Issues

**Problem**: Airtable API errors
**Solution**:
- Verify `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID`
- Check Airtable table names match configuration
- Ensure API key has proper permissions

#### 4. Performance Issues

**Problem**: Slow loading times
**Solution**:
- Enable Next.js caching
- Configure CDN for static assets
- Optimize database queries
- Monitor and optimize bundle size

## Backup and Recovery

### Database Backup

Airtable provides automatic backups, but you can also:

1. **Export data manually** from Airtable interface
2. **Use Airtable API** to create custom backup scripts
3. **Set up automated exports** using cron jobs

### Application Backup

1. **Code**: Use Git for version control
2. **Environment variables**: Store securely (Vercel/Netlify handle this)
3. **Configuration**: Document all settings

### Disaster Recovery

1. **Document recovery procedures**
2. **Test restore processes**
3. **Keep multiple backup locations**
4. **Monitor backup success**

## Scaling Considerations

### Horizontal Scaling

- **Load balancers**: For multiple server instances
- **Database optimization**: Consider Airtable API limits
- **Caching**: Implement Redis for session storage
- **CDN**: For static asset delivery

### Performance Monitoring

- **Application metrics**: Response times, error rates
- **Database performance**: API call frequency, response times
- **User experience**: Page load times, booking success rates
- **Infrastructure**: Server resources, network performance