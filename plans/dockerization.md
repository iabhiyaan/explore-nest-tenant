# Dockerization Plan for Cloud-Sansar API Platform

**Date:** January 22, 2026
**Project:** Cloud-Sansar NestJS API Platform Dockerization

## 1. Overview

Create a complete Docker setup for the Cloud-Sansar NestJS v11 API platform, including:

- Multi-stage Dockerfile for optimized production builds
- Docker Compose for local development with PostgreSQL
- Health checks with database connectivity verification
- Secure configuration management

## 2. Platform Analysis

### 2.1 Current Architecture

- **Framework:** NestJS v11 (TypeScript-based Node.js framework)
- **Language:** TypeScript 5.7 with Node.js v24.11.0
- **Database:** PostgreSQL 5432 (TypeORM)
- **Authentication:** JWT-based with Passport
- **Architecture:** Modular monolith with role-based access control

### 2.2 Key Components

- **Source:** `src/` containing auth, users, tenants, roles, health modules
- **Database:** TypeORM entities (User, Tenant, Role, Permission)
- **Build:** `npm run build` → `nest build` → outputs to `dist/`
- **Entry Point:** `node dist/main` on port 3000

### 2.3 External Dependencies

- PostgreSQL database
- JWT authentication
- Health check endpoint at `/health`

## 3. Deliverables

### 3.1 Files Created

| File                     | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `.dockerignore`          | Exclude unnecessary files from Docker context |
| `Dockerfile`             | Multi-stage build for production optimization |
| `Dockerfile.dev`         | Development image with hot reload support     |
| `docker-compose.yml`     | Production/standard Docker Compose setup      |
| `docker-compose.dev.yml` | Development with hot reload and bind mounts   |
| `.env.example`           | Template for environment variables            |
| `scripts/healthcheck.js` | Health check script for container monitoring  |

### 3.2 `.dockerignore` Contents

```
# Dependencies
node_modules/
dist/
npm-debug.log*

# Configuration & Secrets
.env
.env.local
.env.*.local

# Testing
test/
*.test.ts
*.spec.ts
coverage/

# Version Control
.git/
.gitignore
.gitattributes

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Documentation
README.md
CHANGELOG.md
docs/
```

### 3.3 `Dockerfile` (Multi-Stage)

#### Build Stage

```dockerfile
# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build
```

#### Production Stage

```dockerfile
# Production stage
FROM node:24-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check with database verification
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node /app/scripts/healthcheck.js

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main"]
```

### 3.4 `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cloud-sansar-api
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=${DB_USERNAME:-postgres}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_DATABASE=${DB_DATABASE:-cloud_sansar}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-1d}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - sansar-network
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: cloud-sansar-postgres
    environment:
      - POSTGRES_USER=${DB_USERNAME:-postgres}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_DATABASE:-cloud_sansar}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USERNAME:-postgres}']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - sansar-network
    restart: unless-stopped

networks:
  sansar-network:
    driver: bridge

volumes:
  postgres_data:
```

### 3.5 `Dockerfile.dev` (Development with Hot Reload)

```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

EXPOSE 3000 9229

CMD ["npm", "run", "start:dev"]
```

### 3.6 `docker-compose.dev.yml` (Hot Reload Development)

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: cloud-sansar-api-dev
    ports:
      - '3000:3000'
      - '9229:9229' # Debug port
    environment:
      - NODE_ENV=development
      - PORT=3000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=${DB_USERNAME:-postgres}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_DATABASE=${DB_DATABASE:-cloud_sansar}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h}
      - LOG_LEVEL=debug
    volumes:
      - ./src:/app/src
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - sansar-network
    restart: unless-stopped

  postgres:
    extends:
      file: docker-compose.yml
      service: postgres

networks:
  sansar-network:
    external: true
```

### 3.7 `.env.example`

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
DB_DATABASE=cloud_sansar

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=1d

# Logging
LOG_LEVEL=info

# Swagger
SWAGGER_PATH=api
```

## 4. Environment Variables

### 4.1 Required Variables

| Variable      | Description                       | Default | Sensitive |
| ------------- | --------------------------------- | ------- | --------- |
| `DB_PASSWORD` | PostgreSQL password               | -       | Yes       |
| `JWT_SECRET`  | JWT signing secret (min 32 chars) | -       | Yes       |

### 4.2 Optional Variables

| Variable         | Description                | Default        |
| ---------------- | -------------------------- | -------------- |
| `NODE_ENV`       | Environment mode           | `production`   |
| `PORT`           | API listening port         | `3000`         |
| `DB_HOST`        | PostgreSQL hostname        | `postgres`     |
| `DB_PORT`        | PostgreSQL port            | `5432`         |
| `DB_USERNAME`    | Database user              | `postgres`     |
| `DB_DATABASE`    | Database name              | `cloud_sansar` |
| `JWT_EXPIRES_IN` | Token expiration time      | `1d`           |
| `LOG_LEVEL`      | Logging level              | `info`         |
| `SWAGGER_PATH`   | Swagger documentation path | `api`          |

## 5. Health Check Implementation

### 5.1 Health Check Script (`scripts/healthcheck.js`)

```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.error('Health check failed: HTTP', res.statusCode);
    process.exit(1);
  }
});

req.on('error', (error) => {
  console.error('Health check failed:', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Health check timed out');
  req.destroy();
  process.exit(1);
});

req.end();
```

### 5.2 Health Check Behavior

1. **Interval:** 30 seconds between checks
2. **Timeout:** 10 seconds per check
3. **Retries:** 3 consecutive failures before marking unhealthy
4. **Start Period:** 5 seconds before first check
5. **Verification:**
   - HTTP 200 response from `/health` endpoint
   - TypeORM database connection active

## 6. Usage Instructions

### 6.1 Initial Setup

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables with your values
nano .env
```

### 6.2 Standard Development (With Rebuild on Code Changes)

```bash
# Build and start services
docker-compose up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### 6.3 Hot Reload Development (Live Code Changes)

```bash
# Create the network first (one-time)
docker network create sansar-network

# Start with hot reload - code changes reflect immediately
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

**Hot Reload Features:**

- `src/` directory mounted into container
- `npm run start:dev` runs with `--watch` mode
- TypeScript recompiles on file changes
- Debug port 9229 available for IDE attachment
- No rebuild needed for code changes

### 6.4 Production Build

```bash
# Build image
docker build -t cloud-sansar-api:latest .

# Run container
docker run -d \
  --name cloud-sansar-api \
  -p 3000:3000 \
  -e DB_PASSWORD=your_password \
  -e JWT_SECRET=your_secret \
  cloud-sansar-api:latest
```

### 6.5 Production with Docker Compose

```bash
# Copy and configure environment
cp .env.example .env.production
nano .env.production

# Deploy
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose -f docker-compose.yml logs -f

# Stop
docker-compose -f docker-compose.yml down
```

## 7. Security Considerations

### 7.1 Container Security

- Non-root user (`nestjs`) for application container
- Minimal Alpine-based Node.js image
- No secrets baked into image
- Separate networks for service communication

### 7.2 Configuration Management

- Environment variables for all secrets
- `.env` files excluded from Docker context
- Template provided via `.env.example`

### 7.3 Database Security

- PostgreSQL with health check
- Persistent volume for data durability
- Network isolation via custom bridge network

## 8. Validation Checklist

- [x] Multi-stage Dockerfile for optimized builds
- [x] Non-root user for container security
- [x] Health check with database verification
- [x] Docker Compose for local development
- [x] PostgreSQL with health check and persistence
- [x] Environment variable configuration
- [x] Network isolation between services
- [x] Proper .dockerignore configuration
- [x] Development Dockerfile with hot reload support
- [x] Docker Compose dev file with bind mounts
- [x] Health check script implementation
