## Project setup

```bash
# Copy .env.example to .env
cp .env.example .env

# Update the .env file with your database credentials and JWT secret
```

## With Docker

### Development

```bash
# Create the network first (one-time)
docker network create sansar-network

# Start with hot reload - code changes reflect immediately
docker-compose -f docker-compose.dev.yml up -d

# Seed the database with initial data
npm run seed:docker

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

**Endpoints:**

- API: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api
- Health Check: http://localhost:3000/api/v1/health

### Production

```bash
# Build and start services
docker-compose up -d

# Seed the database (if needed)
docker-compose exec app npm run seed

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Without Docker

### Development

```bash
# Install dependencies
nvm use && npm install

# Start PostgreSQL locally (required)
# Then update .env with DB_HOST=localhost

# Seed the database with initial data
nvm use && npm run seed

# Start development server with hot reload
nvm use && npm run start:dev
```

### Production

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

## Run tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Default Users

After seeding, the following users are created:

| Username     | Password  | Role          |
| ------------ | --------- | ------------- |
| superadmin   | admin123  | SUPER_ADMIN   |
| companyadmin | admin123  | COMPANY_ADMIN |
| clientuser   | client123 | CLIENT        |
